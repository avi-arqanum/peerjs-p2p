const CryptoJS = require("crypto-js");

export default function calculateTransactionId(transactionData) {
	let transactionString = "";

	transactionString += transactionData.inputUTXOs.length;

	// Concatenate input UTXOs
	for (const input of transactionData.inputUTXOs) {
		transactionString +=
			input.transactionId +
			input.outputIndex +
			input.amount +
			input.senderId;
	}

	transactionString += transactionData.outputUTXOs.length;

	// Concatenate output UTXOs
	for (const output of transactionData.outputUTXOs) {
		transactionString += output.amount + output.recieverId;
	}

	// Hash the concatenated string
	return CryptoJS.SHA256(transactionString).toString();
}
