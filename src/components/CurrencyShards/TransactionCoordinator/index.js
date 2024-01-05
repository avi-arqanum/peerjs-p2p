import { useEffect } from "react";
import PeerConnection from "../../../peer";

const transactionManagerId =
	"5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9";

const transactionCoordinatorId = "";

// let's say total 4 shards
const utxoShardIds = [];
const distributeHashes = (hashArray) => {
	var shards = [[], [], [], []];

	hashArray.forEach((hash) => {
		if (hash.length === 0) return;

		let lastChar = hash[hash.length - 1].toLowerCase();
		if (lastChar >= "0" && lastChar <= "3") {
			shards[0].push(hash);
		} else if (lastChar >= "4" && lastChar <= "7") {
			shards[1].push(hash);
		} else if (lastChar >= "8" && lastChar <= "b") {
			shards[2].push(hash);
		} else if (lastChar >= "c" && lastChar <= "f") {
			shards[3].push(hash);
		}
	});

	return shards;
};

const shardHashes = new Map();

const hashes = {
	getShardHashes: (transactionId) => {
		return shardHashes.get(transactionId);
	},
	setShardHashes: (compactData) => {
		shardHashes.set(transactionId, {
			inputShardHashes: distributeHashes(compactData.inputHashes),
			outputShardHashes: distributeHashes(compactData.outputHashes),
		});
	},
	deleteShardHashes: (transactionId) => {
		return shardHashes.delete(transactionId);
	},
};

const handleShardValidation = async (compactData) => {
	hashes.setShardHashes(compactData);

	const inputShardHashes = hashes.getShardHashes(
		compactData.transactionId
	).inputShardHashes;

	const shardValidationPromises = [];

	for (let i = 0; i < utxoShardIds.length; i++) {
		const shardId = utxoShardIds[i];

		if (inputShardHashes[i].length === 0) {
			continue;
		}

		shardValidationPromises.push(
			new Promise(async (resolve, reject) => {
				await PeerConnection.connectPeer(shardId);

				await PeerConnection.sendConnection(shardId, {
					action: "prepare",
					type: "hash validation",
					transactionId: compactData.transactionId,
					inputHashes: inputShardHashes[i],
				});

				PeerConnection.onConnectionReceiveData(
					shardId,
					(shardValidationData) => {
						if (shardValidationData.type === "validation result") {
							if (shardValidationData.action === "ready") {
								resolve();
							} else {
								reject();
							}
						}
					}
				);
			})
		);
	}

	const results = await Promise.allSettled(shardValidationPromises);
	const rejected = results.filter((result) => result.status === "rejected");

	return rejected.length === 0;
};

const handleIncomingConnection = async (connection) => {
	const senderId = connection.peer;

	if (senderId === transactionManagerId) {
		PeerConnection.onConnectionReceiveData(
			senderId,
			async (compactData) => {
				switch (compactData.type) {
					case "transaction validation":
						{
							const isValid = await handleShardValidation(
								compactData
							);

							await PeerConnection.sendConnection(senderId, {
								success: isValid,
								type: "validation result",
								transactionId: compactData.transactionId,
							});

							// how would we handle the case when shards have discarded the transaction
							// but transaction manager has come to a valid consensus (ANOMALY)
							// very unlikely though
						}
						break;

					case "transaction invalidated":
						{
							const inputShardHashes = hashes.getShardHashes(
								compactData.transactionId
							).inputShardHashes;

							const shardRollbackPromises = [];

							for (let i = 0; i < utxoShardIds.length; i += 1) {
								if (inputShardHashes[i].length === 0) {
									continue;
								}

								const shardId = utxoShardIds[i];

								shardRollbackPromises.push(
									new Promise(async (resolve) => {
										await PeerConnection.sendConnection(
											shardId,
											{
												action: "rollback",
												transactionId:
													compactData.transactionId,
												inputShardHashes,
											}
										);

										PeerConnection.onConnectionReceiveData(
											shardId,
											(shardResponse) => {
												if (
													shardResponse.type ===
														"rollback response" &&
													shardResponse.action ===
														"complete"
												) {
													resolve();
												}
											}
										);
									})
								);
							}

							await Promise.all(shardRollbackPromises);
							console.log(
								"All the validators have rollback & unlocked the UTXOs"
							);
						}
						break;

					case "transaction validated":
						{
							const shardHashes = hashes.getShardHashes(
								compactData.transactionId
							);

							const shardCommitPromises = [];

							for (let i = 0; i < utxoShardIds.length; i += 1) {
								if (
									shardHashes.inputShardHashes[i].length ===
										0 &&
									shardHashes.outputShardHashes[i].length ===
										0
								) {
									continue;
								}

								const shardId = utxoShardIds[i];

								shardCommitPromises.push(
									new Promise(async (resolve) => {
										await PeerConnection.sendConnection(
											shardId,
											{
												action: "commit",
												transactionId:
													compactData.transactionId,
												...shardHashes,
											}
										);

										PeerConnection.onConnectionReceiveData(
											shardId,
											(shardResponse) => {
												if (
													shardResponse.type ===
														"commit response" &&
													shardResponse.action ===
														"complete"
												) {
													resolve();
												}
											}
										);
									})
								);
							}

							await Promise.all(shardCommitPromises);

							await PeerConnection.sendConnection(senderId, {
								type: "ledger updated",
								success: true,
							});
						}
						break;
				}
			}
		);
	}
};

const TransactionCoordinator = () => {
	useEffect(() => {
		const initializeConnection = async () => {
			await PeerConnection.startPeerSession(transactionCoordinatorId);

			PeerConnection.onIncomingConnection(handleIncomingConnection);
		};

		initializeConnection();
	}, []);
};

export default TransactionCoordinator;