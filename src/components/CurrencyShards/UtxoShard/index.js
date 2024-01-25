import { useEffect } from "react";

import PeerConnection from "../../../peer";
import MPT from "./merklePatriciaTrie";
import nodeIds from "../../../Ids";

const transactionCoordinatorId = nodeIds["transaction coordinator"].id;
const shardId = nodeIds["utxo shard"].id;

const Mpt = MPT();

const handleIncomingConnection = (connection) => {
	const senderId = connection.peer;

	if (senderId === transactionCoordinatorId) {
		PeerConnection.onConnectionReceiveData(senderId, async (data) => {
			switch (data.action) {
				case "prepare":
					{
						// check UHS whether inputHashes exist & whether they are unlocked
						const isValid = Mpt.validateTransaction(data);

						await PeerConnection.sendConnection(senderId, {
							type: "validation result",
							action: isValid ? "ready" : "reject",
							transactionId: data.transactionId,
						});

						console.log(
							"UTXO shard has",
							isValid ? "accepted" : "rejected",
							"the transaction"
						);
					}
					break;

				case "rollback":
					// unlock the inputHashes if locked
					Mpt.rollbackTransaction(data);

					await PeerConnection.sendConnection(senderId, {
						type: "rollback response",
						action: "complete",
					});

					console.log(
						"UTXO shard has successfully unlocked the inputHashes"
					);
					break;

				case "commit":
					// update UHS by deleting inputHashes & adding outputHashes
					Mpt.swapAbstraction(data);

					PeerConnection.sendConnection(senderId, {
						type: "commit response",
						action: "complete",
					});

					console.log("Transaction commit complete");
					break;
			}
		});
	}
};

const UtxoShard = () => {
	useEffect(() => {
		const initializeConnection = async () => {
			await PeerConnection.startPeerSession(shardId);

			PeerConnection.onIncomingConnection(handleIncomingConnection);
		};

		initializeConnection();
	}, []);
};

export default UtxoShard;
