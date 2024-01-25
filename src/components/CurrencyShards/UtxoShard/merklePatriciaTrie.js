import { BaseTrie } from "merkle-patricia-tree";

export default class MPT {
	static instance = null;

	constructor() {
		if (!MPT.instance) {
			this.Trie = new BaseTrie();
			MPT.instance = this;
		}

		return MPT.instance();
	}

	getUtxoValue(key) {
		return this.Trie.get(Buffer.from(key));
	}

	addUtxo(key) {
		this.Trie.put(Buffer.from(key), Buffer.from("false"));
	}

	updateUtxo(key, lock) {
		this.Trie.put(Buffer.from(key), Buffer.from(lock ? "true" : "false"));
	}

	deleteUtxo(key) {
		this.Trie.del(Buffer.from(key));
	}

	validateTransaction(compactData) {
		const { inputHashes } = compactData;

		for (let inputHash of inputHashes) {
			const value = this.getUtxoValue(inputHash);

			if (!value) {
				return false;
			}

			if (value.toString() === "true") {
				return false;
			}

			this.updateUtxo(key, true);
		}

		return true;
	}

	rollbackTransaction(compactData) {
		const { inputHashes } = compactData;

		for (let inputHash of inputHashes) {
			this.updateUtxo(inputHash, false);
		}
	}

	swapAbstraction(compactData) {
		const { inputHashes, outputHashes } = compactData;

		for (let inputHash of inputHashes) {
			this.deleteUtxo(inputHash);
		}

		for (let outputHash of outputHashes) {
			this.addUtxo(outputHash);
		}
	}
}
