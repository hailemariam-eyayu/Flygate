import express from "express";
import soap from "soap";
import axios from "axios"; // Added missing import
import { config } from 'dotenv';
import { prisma } from "../config/db.js";
config();

const shortcode = process.env.shortCodeT;
const url = process.env.BASE_URL; // Ensure URL is defined

const validatePNR = async (req, res) => {
    console.log("PNR Validate method");
    const { orderid } = req.body;
    console.log(orderid);

    try {
        // Corrected query parameter syntax using URLSearchParams or template literals
        console.log("Try block");
    const response = await axios.get(`${url}/Enat/api/V1.0/Enat/GetOrder`, {
    params: {
        orderId: orderid,
        shortCode: shortcode
    },
    // Add this block
    auth: {
        username: 'EnatBankTest@ethiopianairlines.com',
        password: 'EnatBankTest@123'
    }
});

        if (response.data) {
            // Store order details for later use in confirmOrder
            await prisma.pendingOrder.upsert({
                where: { orderId: orderid },
                update: {
                    amount: Number(response.data.Amount || response.data.amount),
                    customerName: response.data.CustomerName,
                },
                create: {
                    orderId: orderid,
                    amount: Number(response.data.Amount || response.data.amount),
                    customerName: response.data.CustomerName,
                }
            });

            return res.status(200).json({
                success: true,
                data: response.data
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// Configuration from your Web.config
const CBS_URL = process.env.cbs_url || "http://10.1.22.100:7003/FCUBSAccService/FCUBSAccService?WSDL";
const CBS_USER = process.env.cbs_user || "ADCUSER";
const CBS_PASS =  process.env.cbs_pass || "cbs_password"; // Replace with actual password

const confirmOrder = async (req, res) => {
    const { orderid, beneficiaryAcno, remark, traceNumber } = req.body;

    // Retrieve stored data from validation step if not provided in body
    const storedOrder = (await prisma.pendingOrder.findUnique({
        where: { orderId: orderid }
    })) || {};
    const amount = req.body.amount || storedOrder.amount;
    const customerName = req.body.customerName || storedOrder.customerName;

    try {
        // --- 1. CBS INTERACTION (SOAP with Basic Auth) ---
        
        // Create the Basic Auth Header (Base64 encoded)
        const authHeader = "Basic " + Buffer.from(`${CBS_USER}:${CBS_PASS}`).toString("base64");

        const soapOptions = {
            wsdl_headers: { Authorization: authHeader } // For fetching the WSDL
        };

        const soapClient = await soap.createClientAsync(CBS_URL, soapOptions);
        
        // Set security for the actual method calls
        soapClient.setSecurity(new soap.BasicAuthSecurity(CBS_USER, CBS_PASS));

        const cbsHeader = {
            SOURCE: "ADC",
            USERID: CBS_USER,
            BRANCH: "001", // BranchCode from Web.config
            SERVICE: "FCUBSAccService",
            OPERATION: "CreateTransaction"
        };

        // CBS Interaction here.
        const [cbsResult] = await soapClient.CreateTransactionAsync({ 
            FCUBS_HEADER: cbsHeader, 
            FCUBS_BODY: { CUSTACNO: beneficiaryAcno, LCYAMOUNT: amount, REMARK: remark } 
        });

        const cbsRef = cbsResult.REFERENCE_NO;

        // --- 2. FLYGATE INTERACTION (REST) ---
        
        const flyGatePayload = {
            OrderId: orderid,
            shortCode: process.env.shortCodeT,
            Amount: amount,
            Currency: "ETB",
            status: 1,
            remark: "Successfully Paid",
            TraceNumber: traceNumber,
            ReferenceNumber: cbsRef,
            PayerCustomerName: customerName || "Enat Customer",
            PaidAccountNumber: beneficiaryAcno
        };

        // If FlyGate also requires Basic Auth, add the headers object here
        const flyGateResponse = await axios.post(
            `${process.env.url}/Enat/api/V1.0/Enat/ConfirmOrder`, 
            flyGatePayload,
            { headers: { Authorization: authHeader } } // Example if FlyGate uses same credentials
        );

        // Clean up stored order
        await prisma.pendingOrder.delete({
            where: { orderId: orderid }
        }).catch(() => {}); // Ignore error if already deleted or record missing

        return res.json({
            status: "Success",
            message: "Successfully transferred",
            reference: cbsRef
        });

    } catch (error) {
        return res.status(500).json({ status: "Error", message: error.message });
    }
};

export { validatePNR, confirmOrder };



// const CBS_URL = "http://10.1.22.100:7003/FCUBSAccService/FCUBSAccService?WSDL"; 

// const confirmOrder = async (req, res) => {
//     const { orderid, amount, beneficiaryAcno, remark } = req.body;

//     try {
//         // --- 1. CBS Interaction (Oracle Flexcube SOAP Call) ---
//         const soapClient = await soap.createClientAsync(CBS_URL);
        
//         // Constructing the header based on Web.config requirements 
//         const cbsHeader = {
//             SOURCE: "ADC", // From Header_Source 
//             USERID: "ADCUSER", // From Header_UserID 
//             BRANCH: "004", // From Header_Branch 
//             SERVICE: "FCUBSAccService",
//             OPERATION: "CreateTransaction"
//         };

//         const cbsBody = {
//             // Mapping fields to the Flexcube account service requirements
//             CUSTACNO: beneficiaryAcno,
//             LCYAMOUNT: amount,
//             REMARK: remark
//         };

//         // Execute CBS Debit/Credit
//         const [cbsResult] = await soapClient.CreateTransactionAsync({ FCUBS_HEADER: cbsHeader, FCUBS_BODY: cbsBody });
        
//         // Assume cbsResult contains a unique 'ReferenceNumber' on success
//         const cbsRef = cbsResult.REFERENCE_NO;

//         // --- 2. Send Data to FlyGate (Airline) ---
//         // Based on the provided image documentation for "Confirm Order (Confirm Payment)"
//         const flyGatePayload = {
//             Header: "Basic AUTH_TOKEN", 
//             OrderId: orderid,
//             shortCode: process.env.shortCodeT,
//             Amount: amount,
//             Currency: "ETB",
//             Status: 1, // 1 = Success
//             Remark: "Successfully Paid",
//             TraceNumber: `TRC${Date.now()}`, // Unique Ethiopian Gateway number
//             ReferenceNumber: cbsRef, // Unique bank reference from CBS
//             PaidAccountNumber: beneficiaryAcno,
//             PayerCustomerName: req.body.customerName || "Enat Customer"
//         };

//         const flyGateResponse = await axios.post(
//             `${process.env.url}/Enat/api/V1.0/Enat/ConfirmOrder`, 
//             flyGatePayload
//         );

//         // --- 3. Return Final Response to your Frontend ---
//         return res.json({
//             status: "Success",
//             message: "Transaction and FlyGate confirmation complete",
//             cbsReference: cbsRef,
//             flyGateData: flyGateResponse.data
//         });

//     } catch (error) {
//         console.error("Transaction Error:", error);
//         return res.status(500).json({
//             status: "Error",
//             message: "Transaction failed",
//             error: error.message
//         });
//     }
// };

// const confirmOrder = async (req, res) => {
//     const { beneficiaryAcno, amount, cbsRef, remark } = req.body;

//     try {
//         // 1. Validate Request (Check if account and amount are present)
        
//         // // CBS Interaction here.
//         // This is where you call your internal Banking SOAP/REST API to:
//         // - Verify the account exists and is active.
//         // - Check if the account has sufficient balance.
//         // - Perform the actual debit/credit (Move the money).
//         // - Receive a unique transaction reference from the bank.

//         // 2. Notify FlyGate (Only if CBS transaction was successful)
//         const response = await axios.post(`${url}/Enat/api/V1.0/Enat/ConfirmOrder`, {
//             account: beneficiaryAcno,
//             amount: amount,
//             reference: cbsRef, // Usually the reference generated by your CBS
//             remark: remark
//         });

//         return res.json({
//             status: "Success",
//             message: "Successfully transferred",
//             reference: cbsRef
//         });

//     } catch (error) {
//         // 3. Error Handling (Rollback or notify failure)
//         return res.status(500).json({
//             status: "Error",
//             message: "Transaction failed during CBS or FlyGate sync",
//             error: error.message
//         });
//     }

// };