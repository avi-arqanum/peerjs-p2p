const CryptoJS = require("crypto-js");

export default function calculateTransactionId(transactionData) {
	let transactionString = "";

	transactionString += transactionData.inputUtxos.length;

	// Concatenate input UTXOs
	for (const input of transactionData.inputUtxos) {
		transactionString +=
			input.transactionId +
			input.outputIndex +
			input.amount +
			input.publicKey;
	}

	transactionString += transactionData.outputUtxos.length;

	// Concatenate output UTXOs
	for (const output of transactionData.outputUtxos) {
		transactionString += output.amount + output.publicKey;
	}

	// Hash the concatenated string
	return CryptoJS.SHA256(transactionString).toString();
}
