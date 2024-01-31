import { BaseTrie } from "merkle-patricia-tree";
import { Buffer } from "buffer";

export default class MPT {
	static instance = null;

	constructor() {
		if (!MPT.instance) {
			this.Trie = new BaseTrie();
			MPT.instance = this;
		}

		return MPT.instance;
	}

	async getUtxoValue(key) {
		const value = await this.Trie.get(Buffer.from(key));
		return value;
	}

	async addUtxo(key) {
		await this.Trie.put(Buffer.from(key), Buffer.from("false"));
	}

	async updateUtxo(key, lock) {
		await this.Trie.put(
			Buffer.from(key),
			Buffer.from(lock ? "true" : "false")
		);
	}

	async deleteUtxo(key) {
		await this.Trie.del(Buffer.from(key));
	}

	async validateTransaction(compactData) {
		const { inputHashes } = compactData;
		console.log("inputHashes", inputHashes);

		for (const inputHash of inputHashes) {
			const value = await this.getUtxoValue(inputHash);
			console.log("value", value);

			if (!value) {
				console.log("value doesn't exist", value);
				return false;
			}

			if (value.toString() === "true") {
				console.log("utxo locked", value);
				return false;
			}

			console.log("utxo value exists & not locked");
			await this.updateUtxo(inputHash, true);
		}

		return true;
	}

	async rollbackTransaction(compactData) {
		const { inputHashes } = compactData;

		for (let inputHash of inputHashes) {
			await this.updateUtxo(inputHash, false);
		}
	}

	async swapAbstraction(compactData) {
		console.log(compactData);
		const { inputHashes, outputHashes } = compactData;

		for (let inputHash of inputHashes) {
			await this.deleteUtxo(inputHash);
		}

		for (let outputHash of outputHashes) {
			await this.addUtxo(outputHash);
		}
	}
}
