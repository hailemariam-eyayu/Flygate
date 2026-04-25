import express from "express";
import soap from "soap";
import axios from "axios"; // Added missing import
import { config } from 'dotenv';
import { prisma } from "../config/db.js";
config();

const refundRequest = async (req, res) => {
    const { shortCode, orderId, firstName, lastName, amount, currency, ReferenceNumber, refundFOP, refundReferenceCode } = req.body;

    // Check CBS Trn and if there is reverse else return failure reason
    const cbs_sucess = true;
    const responce = "";
    if (cbs_sucess) {
        return res.status(200).json({
            "ResponseCode": 1,
            "success": "Success",
            "ResponseCodeDescription": "Successfully accepted Refund request"
        });
    } else {
        return res.status(200).json({
            "ResponseCode": 0,
            "ResponseCodeDescription": "There is no any transaction associated with this {ReferenceNumber}",
            "Status": "Error"
        });
    }


};

// {
// "shortCode": "526341",
// "orderId": "ABCDEF",
// "firstName": "Abebe",
// "lastName": "Kebede",
// “amount”: “100.00”,
// "currency": “ETB”,
// "ReferenceNumber": "FT1234566789"
// "refundFOP": "138",
// "refundReferenceCode": "EM24379446057FGHJHGFD"
// }



// 2026-04-21 07:56:26,858 [14] DEBUG  - TransferTrn Req :
// <VSTLREQUEST>
//     <REQUESTTYPE>TRANSFERTRN</REQUESTTYPE>
//     <IBTRNREF>0</IBTRNREF>
//     <IBREQREF>340</IBREQREF>
//     <DRACNO>0011122015513001</DRACNO>
//     <CRACNO>1081080</CRACNO>
//     <AMOUNT>18</AMOUNT>
//     <PBKTRNTYPE>3</PBKTRNTYPE>
//     <CHARGESAMT>0</CHARGESAMT>
//     <CHARGESAMT2>0</CHARGESAMT2>
//     <PLACNO>0</PLACNO>
//     <DRPARTICULARS>Telebirr Cr, Telebirr TrnID : BEM525111, Sender Mobile 251918666666</DRPARTICULARS>
//     <CRPARTICULARS>Telebirr Cr, Telebirr TrnID : BEM525111, Sender Mobile 251918666666</CRPARTICULARS>
//     <CHRGINCLUSIVE></CHRGINCLUSIVE>
//     <REFNO>340</REFNO>
//     <DEVICEID></DEVICEID>
//     <BILLCOMPANYID>0</BILLCOMPANYID>
//     <BILLNO>0</BILLNO>
//     <TRNMODE>2</TRNMODE>
//     <pChannelID>4</pChannelID>
//     <TRNREFNO>BEM525111</TRNREFNO>
//     <TRNDATE>04/12/2023</TRNDATE>
//     <TXNCODE>TBIT</TXNCODE>
// </VSTLREQUEST>
// <VSTLCHECKSUM>3368c9b893c690c45902c62ef1c10472a99628ee825e6a2d251e223596541df68a0d45e164db18288190323106803215475dedbb6a1d97f942fe3f5d80f85e3f</VSTLCHECKSUM>
// 2026-04-21 07:56:27,395 [14] DEBUG  - TransferTrn Request XML :
// <?xml version="1.0" encoding="utf-16"?>
// <CREATETRANSACTION_FSFS_REQ xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
//     <FCUBS_HEADER xmlns="http://fcubs.ofss.com/service/FCUBSRTService">
//         <SOURCE>ADC</SOURCE>
//         <UBSCOMP>FCUBS</UBSCOMP>
//         <USERID>ADCUSER</USERID>
//         <BRANCH>001</BRANCH>
//         <SERVICE>FCUBSRTService</SERVICE>
//         <OPERATION>CreateTransaction</OPERATION>
//     </FCUBS_HEADER>
//     <FCUBS_BODY xmlns="http://fcubs.ofss.com/service/FCUBSRTService">
//         <Transaction-Details>
//             <PRD>TBIT</PRD>
//             <BRN>004</BRN>
//             <TXNBRN>001</TXNBRN>
//             <TXNACC>1081080</TXNACC>
//             <TXNCCY>ETB</TXNCCY>
//             <TXNAMT>18</TXNAMT>
//             <OFFSETBRN>004</OFFSETBRN>
//             <OFFSETACC>1081080</OFFSETACC>
//             <OFFSETCCY>ETB</OFFSETCCY>
//             <OFFSETAMT>18</OFFSETAMT>
//             <TXNDATE>2023-12-04</TXNDATE>
//             <NARRATIVE>Telebirr Cr, Telebirr TrnID : BEM525111, Sender Mobile 251918666666</NARRATIVE>
//             <AUTHSTAT>A</AUTHSTAT>
//         </Transaction-Details>
//     </FCUBS_BODY>
// </CREATETRANSACTION_FSFS_REQ>

