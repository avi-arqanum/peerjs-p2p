import { ec as EC } from "elliptic";

function generateKeyPair(seedString) {
	const ec = new EC("secp256k1");

	const encoder = new TextEncoder();
	const seed = encoder.encode(seedString);
	console.log(seed);

	const keyPair = ec.keyFromPrivate(seed);

	const publicKeyHex = keyPair.getPublic().encode("hex");

	return {
		keyPair,
		publicKeyHex,
	};
}

function createSignature(utxo, keyPair) {
	const utxoString =
		utxo.transactionId + utxo.outputIndex + utxo.publicKey + utxo.amount;

	const signature = keyPair.sign(utxoString).toDER("hex");

	return signature;
}

function verifySignature(utxo, signature) {
	const ec = new EC("secp256k1");

	const utxoString =
		utxo.transactionId + utxo.outputIndex + utxo.publicKey + utxo.amount;

	const key = ec.keyFromPublic(utxo.publicKey, "hex");

	return key.verify(utxoString, signature);
}

const App = () => {
	const { keyPair, publicKeyHex } = generateKeyPair("0");
	console.log(publicKeyHex);

	const utxo = {
		transactionId: "transactionId",
		outputIndex: 0,
		amount: 15,
		publicKey: publicKeyHex,
	};

	const signature = createSignature(utxo, keyPair);

	const result = verifySignature(utxo, signature);

	console.log(result);
};

export default App;
