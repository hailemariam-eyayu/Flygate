import express from "express";
import soap from "soap";
import axios from "axios"; // Added missing import
import { config } from 'dotenv';
import { prisma } from "../config/db.js";
config();

const shortcode = process.env.shortCodeT || 526341;
const url = process.env.BASE_URL; // Ensure URL is defined

const validatePNR = async (req, res) => {
    console.log("PNR Validate method");
    const { orderid } = req.body;
    console.log(orderid);

    try {
        // Corrected query parameter syntax using URLSearchParams or template literals
        console.log("Try block");
        const getOrderParams = {
            OrderId: orderid,
            shortCode: shortcode
        };
        console.log("Request to Airline (GetOrder):", getOrderParams);

        const response = await axios.get(`${url}/Enat/api/V1.0/Enat/GetOrder`, {
            params: getOrderParams,
            // Add this block
            auth: {
                username: 'EnatBankTest@ethiopianairlines.com',
                password: 'EnatBankTest@!23'
            },
            // Prevent 500 status codes from throwing an exception so we can read the business error in response.data
            validateStatus: (status) => status >= 200 && status < 600
        });

        console.log("Response from Airline (GetOrder):", response.data);

        // Check for success based on statusCodeResponse (0 or 1 usually success, 4 is Not Found)
        if (response.data && response.data.statusCodeResponseDescription === "Success" || (response.data.amount > 0)) {
            // Store order details for later use in confirmOrder
            console.log("Response data:", response.data);

            const savedOrder = await prisma.fLYGATEDetails.upsert({
                where: { orderId: orderid },
                update: {
                    amount: Number(response.data.Amount || response.data.amount || 0),
                    customerName: response.data.CustomerName || response.data.customerName || "Unknown",
                },
                create: {
                    orderId: orderid,
                    amount: Number(response.data.Amount || response.data.amount || 0),
                    customerName: response.data.CustomerName || response.data.customerName || "Unknown",
                }
            });

            return res.status(200).json({
                success: true,
                data: savedOrder
            });
        } else {
            console.log("Validation Failed. Full Response:", JSON.stringify(response.data, null, 2));
            return res.status(404).json({
                success: false,
                message: response.data.statusCodeResponseDescription || response.data.message || "Order not found or expired",
                errorCode: response.data.errorCode,
                orderId: response.data.orderId || orderid,
                rawResponse: response.data
            });
        }
    } catch (error) {
        console.error("Error occurred while validating PNR:", error);
        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message || "Internal Server Error",
            error: error.response?.data || error.message,
            statusCode: error.response?.status || 500
        });
    }
};


// Configuration from your Web.config
const CBS_URL = process.env.cbs_url || "http://10.1.22.100:7003/FCUBSAccService/FCUBSAccService?WSDL";
const CBS_USER = process.env.cbs_user || "ADCUSER";
const CBS_PASS = process.env.cbs_pass || "cbs_password"; // Replace with actual password

const confirmOrder = async (req, res) => {
    const { orderid, beneficiaryAcno, remark } = req.body;

    try {
        // Retrieve stored data from validation step
        // const storedOrder = await prisma.fLYGATEDetails.findUnique({
        const storedOrder = await prisma.fLYGATEDetails.findFirst({
            where: { orderId: orderid }
        });

        if (!storedOrder) {
            return res.status(404).json({ status: "Error", message: "Order details not found. Please validate PNR first." });
        }

        // Checking order status whether it is already paid or not
        if (storedOrder.status === 1) {
            return res.status(400).json({ status: "Error", message: "Order has already been paid." });
        }

        const amount = storedOrder.amount;
        const customerName = storedOrder.customerName;
        const finalTraceNumber = storedOrder.id || `TRC${Date.now()}`; // Using DB ID for TraceNumber
        const finalReferenceNumber = `CBS${Date.now()}`; // Default value for CBS reference

        // --- 1. CBS INTERACTION (SOAP) ---
        const cbsRequestArgs = {
            "FCUBS_HEADER": {
                "SOURCE": "PTP",
                "UBSCOMP": "FCUBS",
                "CORRELID": `CORR${Date.now()}`,
                "USERID": CBS_USER,
                "BRANCH": "001",
                "MODULEID": "RT",
                "SERVICE": "FCUBSAccService",
                "OPERATION": "Create Transaction"
            },
            "FCUBS_BODY": {
                "Transaction-Details": {
                    "PRD": "EMIT",
                    "BRN": "001",
                    "TXNBRN": "001",
                    "TXNACC": beneficiaryAcno,
                    "TXNCCY": "ETB",
                    "TXNAMT": amount,
                    "OFFSETBRN": "001",
                    "OFFSETACC": process.env.airlineAccountNumber,
                    "OFFSETCCY": "ETB",
                    "OFFSETAMT": amount,
                    "TXNDATE": new Date().toISOString().split('T')[0],
                    "NARRATIVE": `Flygate Trn for order ID ${orderid}`,
                    "AUTHSTAT": "A"
                }
            }
        };

        console.log("Request to CBS (CreateTransaction):", JSON.stringify(cbsRequestArgs, null, 2));
        
        // Log Request to DB
        await prisma.dBLog.create({
            data: {
                type: "CBS_CONFIRM_REQ",
                orderId: orderid,
                payload: JSON.stringify(cbsRequestArgs)
            }
        }).catch(e => console.error("Log Error:", e));

        // Create SOAP client and call CBS
        const cbsResponse = await soap.createClientAsync(CBS_URL)
            .then(client => {
                return client.CreateTransactionAsync(cbsRequestArgs);
            })
            .catch(err => {
                console.error("CBS SOAP Error:", err);
                throw new Error("Failed to process transaction with CBS");
            });
        console.log("Response from CBS (CreateTransaction):", JSON.stringify(cbsResponse, null, 2));

        // Log Response to DB
        await prisma.dBLog.create({
            data: {
                type: "CBS_CONFIRM_RES",
                orderId: orderid,
                payload: JSON.stringify(cbsResponse)
            }
        }).catch(e => console.error("Log Error:", e));

        // --- 2. FLYGATE INTERACTION (REST) ---

        const flyGatePayload = {
            OrderId: orderid,
            shortCode: process.env.shortCodeT,
            Amount: amount,
            Currency: "ETB",
            status: 1,
            remark: "Successfully Paid",
            TraceNumber: finalTraceNumber,
            ReferenceNumber: finalReferenceNumber,
            PayerCustomerName: customerName || "Enat Customer",
            PaidAccountNumber: beneficiaryAcno
        };

        console.log("Request to Flygate (ConfirmOrder):", flyGatePayload);

        // Log Flygate Request
        await prisma.dBLog.create({
            data: {
                type: "FLYGATE_CONFIRM_REQ",
                orderId: orderid,
                payload: JSON.stringify(flyGatePayload)
            }
        }).catch(e => console.error("Log Error:", e));

        // Update order status to paid in DB
        await prisma.fLYGATEDetails.update({
            where: { orderId: orderid },
            data: { 
                status: 1,
                beneficiaryAcno: beneficiaryAcno,
                traceNumber: finalTraceNumber,
                referenceNumber: finalReferenceNumber
            }
        }).catch(e => console.error("Update Status Error:", e));

        // FlyGate interaction
        const flyGateResponse = await axios.post(
            `${url}/Enat/api/V1.0/Enat/ConfirmOrder`,
            flyGatePayload,
            {
                auth: {
                    username: 'EnatBankTest@ethiopianairlines.com',
                    password: 'EnatBankTest@!23'
                }
            }
        );
        console.log("Response from Flygate (ConfirmOrder):", flyGateResponse.data);

        // Log Flygate Response
        await prisma.dBLog.create({
            data: {
                type: "FLYGATE_CONFIRM_RES",
                orderId: orderid,
                payload: JSON.stringify(flyGateResponse.data)
            }
        }).catch(e => console.error("Log Error:", e));

        return res.json({
            status: "Success",
            message: "Successfully transferred",
            reference: finalReferenceNumber,
            rawData: flyGateResponse.data
        });

    } catch (error) {
        return res.status(500).json({
            status: "Error",
            message: error.response?.data?.message || error.message,
            rawData: error.response?.data || null
        });
    }
};


const refundRequest = async (req, res) => {
    // Basic Auth Check for Third Party
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ status: "Error", message: "Authorization header missing"  });
    }

    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    if (user !== 'EnatBankTest@ethiopianairlines.com' || pass !== 'EnatBankTest@!23') {
        return res.status(401).json({ status: "Error", message: "Invalid credentials" });
    }

    const { shortCode, orderId, firstName, lastName, amount, currency, ReferenceNumber, refundFOP, refundReferenceCode } = req.body;

    try {
        const order = await prisma.fLYGATEDetails.findFirst({ where: { orderId: orderId } });

        // CBS Interaction to reverse the transaction
        console.log("Initiating CBS transaction reversal for ReferenceNumber:", ReferenceNumber);
        const cbsRequestArgs = {
            "FCUBS_HEADER": {
                "SOURCE": "PTP",
                "UBSCOMP": "FCUBS",
                "CORRELID": `CORR${Date.now()}`,
                "USERID": "PTPUSER",
                "BRANCH": "001",
                "MODULEID": "RT",
                "SERVICE": "FCUBSRTService",
                "OPERATION": "ReverseTransaction"
            },
            "FCUBS_BODY": {
                "Transaction-Details": {
                    "FCCREF": ReferenceNumber
                }
            }
        };

        console.log("Request to CBS (ReverseTransaction):", JSON.stringify(cbsRequestArgs, null, 2));

        // Log Reversal Request
        await prisma.dBLog.create({
            data: {
                type: "CBS_REFUND_REQ",
                orderId: orderId,
                payload: JSON.stringify(cbsRequestArgs)
            }
        }).catch(e => console.error("Log Error:", e));

        //  Sending request to CBS to reverse the transaction
        // return client.ReverseTransactionAsync(cbsRequestArgs);
        const cbsResponse = await soap.createClientAsync(CBS_URL)
            .then(client => {
                return client.REVERSETRANSACTION_FSFS_REQAsync(cbsRequestArgs);
            })
            .catch(err => {
                console.error("CBS SOAP Error during reversal:", err);
                throw new Error("Failed to reverse transaction with CBS");
            });
        console.log("Response from CBS (ReverseTransaction):", JSON.stringify(cbsResponse, null, 2));

        // Log Reversal Response
        await prisma.dBLog.create({
            data: {
                type: "CBS_REFUND_RES",
                orderId: orderId,
                payload: JSON.stringify(cbsResponse)
            }
        }).catch(e => console.error("Log Error:", e));

        if (cbsResponse && cbsResponse[0] && FCUBS_HEADER.MSGSTAT === "SUCCESS") {
            const flyGatePayload = {
                shortCode: shortCode,
                OrderId: orderId,
                Amount: amount,
                Currency: currency,
                RefundReferenceCode: refundReferenceCode,
                bankRefundReference: ReferenceNumber,
                refundDate: new Date().toISOString().split('T')[0],
                RefundAccountNumber: order ? order.beneficiaryAcno : "Unknown",
                AccountHolderName: `${firstName} ${lastName}`,
                refundFOP: refundFOP,
                status: 1,
                remark: "Successfully Refunded",
            };

            console.log("Request to Flygate (ConfirmRefund):", flyGatePayload);
            const flyGateResponse = await axios.post(
                `${url}/Enat/api/V1.0/Enat/ConfirmRefund`,
                flyGatePayload,
                {
                    auth: {
                        username: 'EnatBankTest@ethiopianairlines.com',
                        password: 'EnatBankTest@!23'
                    }
                }
            );
            console.log("Response from Flygate (ConfirmRefund):", flyGateResponse.data);

            return res.status(200).json({
                "ResponseCode": 1,
                "success": "Success",
                "ResponseCodeDescription": "Successfully accepted Refund request",
                "data": flyGateResponse.data
            });
        } else {
            return res.status(400).json({
                "ResponseCode": 0,
                "ResponseCodeDescription": `There is no transaction associated with Reference: ${ReferenceNumber}`,
                "Status": "Error"
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: "Error",
            message: error.message
        });
    }
};


export { validatePNR, confirmOrder, refundRequest };