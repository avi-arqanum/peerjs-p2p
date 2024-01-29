import CryptoJS from "crypto-js";
import { ec as EC } from "elliptic";

function orderUtxos(utxos) {
	if (!utxos || utxos.length === 0) {
		return [];
	}

	return utxos.sort((a, b) => {
		const stringA = `${a.transactionId}${a.outputIndex}${a.amount}${a.publicKey}`;
		const stringB = `${b.transactionId}${b.outputIndex}${b.amount}${b.publicKey}`;
		return stringA.localeCompare(stringB);
	});
}

class TransactionNode {
	generateMerkleRoot(hashes) {
		function ensureEven(hashes) {
			if (hashes.length % 2 !== 0) {
				hashes.push(hashes[hashes.length - 1]);
			}
		}
		function hashPair(hash1, hash2) {
			return CryptoJS.SHA256(hash1 + hash2).toString(CryptoJS.enc.Hex);
		}

		if (!hashes || hashes.length === 0) {
			return "";
		}

		ensureEven(hashes);

		const combinedHashes = [];
		for (let i = 0; i < hashes.length; i += 2) {
			const hash = hashPair(hashes[i], hashes[i + 1]);
			combinedHashes.push(hash);
		}

		// If the combinedHashes length is 1, it means that we have the merkle root already
		if (combinedHashes.length === 1) {
			return combinedHashes.join("");
		}

		return this.generateMerkleRoot(combinedHashes);
	}

	calculateMerkleRoot(inputUtxos, outputUtxos) {
		function hashUtxo(utxo) {
			const utxoString = `${utxo.transactionId}${utxo.outputIndex}${utxo.amount}${utxo.publicKey}`;
			return CryptoJS.SHA256(utxoString).toString(CryptoJS.enc.Hex);
		}

		const utxos = orderUtxos([...inputUtxos, ...outputUtxos]);
		const hashes = utxos.map((utxo) => hashUtxo(utxo));

		return this.generateMerkleRoot(hashes);
	}

	calculateBlockHash(
		timestamp,
		transactionId,
		merkleRootOfUtxos,
		prevNodesHashes
	) {
		var hashString = `${timestamp}${transactionId}${merkleRootOfUtxos}`;

		prevNodesHashes.forEach((hash) => {
			hashString += hash;
		});

		return CryptoJS.SHA256(hashString).toString(CryptoJS.enc.Hex);
	}

	constructor(
		timestamp,
		transactionId,
		prevNodesHashes,
		inputUtxos,
		outputUtxos
	) {
		const merkleRootOfUtxos = this.calculateMerkleRoot(
			inputUtxos,
			outputUtxos
		);

		const blockHash = this.calculateBlockHash(
			timestamp,
			transactionId,
			merkleRootOfUtxos,
			prevNodesHashes
		);

		this.blockHeader = {
			timestamp: timestamp,
			transactionId: transactionId,
			merkleRootOfUtxos,
			prevNodesHashes: prevNodesHashes,
			blockHash,
		};

		this.blockContent = {
			inputUtxos: inputUtxos,
			outputUtxos: outputUtxos,
		};

		this.nextTransactions = new Array(outputUtxos.length).fill(null);
	}

	updateNextTransactions(outputIndex, nextTransactionId) {
		if (
			outputIndex < 0 ||
			outputIndex >= this.blockContent.outputUtxos.length
		) {
			throw new Error("Invalid output index");
		}

		if (this.nextTransactions[outputIndex] !== null) {
			throw new Error(
				"This output UTXO has already been used in another transaction"
			);
		}

		this.nextTransactions[outputIndex] = nextTransactionId;
	}
}

export default class DAG {
	static instance = null;

	constructor() {
		if (!DAG.instance) {
			this.transactions = new Map();
			DAG.instance = this;
		}

		return DAG.instance;
	}

	validateTransaction(transactionData) {
		function verifySignature(utxo, signature) {
			const ec = new EC("secp256k1");

			const utxoString =
				utxo.transactionId +
				utxo.outputIndex +
				utxo.publicKey +
				utxo.amount;

			const key = ec.keyFromPublic(utxo.publicKey, "hex");

			return key.verify(utxoString, signature);
		}

		const { inputUtxos, digitalSignatures } = transactionData;

		for (let i = 0; i < inputUtxos.length; i += 1) {
			const utxo = inputUtxos[i],
				signature = digitalSignatures[i];

			if (!this.hasTransaction(utxo.transactionId)) {
				console.log("transaction doesn't exist in DAG");
				return false;
			}

			const node = this.transactions.get(utxo.transactionId);

			if (node.nextTransactions[utxo.outputIndex] !== null) {
				console.log("next transactions failed");
				return false;
			}

			if (!verifySignature(utxo, signature)) {
				console.log("verify signature failed");
				return false;
			}
		}

		return true;
	}

	addTransaction(transactionData) {
		const { transactionId, inputUtxos, outputUtxos } = transactionData;

		if (this.transactions.has(transactionId)) {
			throw new Error("Transaction already exists");
		}

		const inputUTXOs = orderUtxos(inputUtxos);
		const outputUTXOs = orderUtxos(outputUtxos);

		const prevNodesHashes = [];
		for (let i = 0; i < inputUTXOs.length; i++) {
			const node = this.transactions.get(inputUTXOs[i].transactionId);

			node.updateNextTransactions(
				inputUTXOs[i].outputIndex,
				transactionId
			);

			prevNodesHashes.push(node.blockHeader.blockHash);
		}

		this.transactions.set(
			transactionId,
			new TransactionNode(
				Date.now(),
				transactionId,
				prevNodesHashes,
				inputUTXOs,
				outputUTXOs
			)
		);
	}

	hasTransaction(transactionId) {
		return this.transactions.has(transactionId);
	}

	printStructure() {
		if (this.transactions.size === 0) {
			console.log("Map is empty!");
		}

		for (const [key, value] of this.transactions) {
			console.log(`key: ${key}, value: `, value);
		}
	}

	drawStructure() {
		const nodes = [],
			links = [];
		for (const [key] of this.transactions) {
			nodes.push({ id: key });
		}

		for (const [key, value] of this.transactions) {
			for (let target of value.nextTransactions) {
				if (target) {
					links.push({
						source: nodes.find((n) => n.id === key),
						target: nodes.find((n) => n.id === target),
					});
				}
			}
		}

		return { d3Nodes: nodes, d3Links: links };
	}
}
