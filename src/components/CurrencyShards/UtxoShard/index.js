import PeerConnection from "../../../peer";

const transactionCoordinatorId = "";

const shardId = "";

const handleIncomingConnection = (connection) => {
	const senderId = connection.peer;

	PeerConnection.onConnectionReceiveData(senderId, async (data) => {
		if (senderId === transactionCoordinatorId) {
			switch (data.action) {
				case "prepare":
					{
						// check UHS whether inputHashes exist & whether they are unlocked
						const isValid = true;
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
					{
						// unlock the inputHashes if locked
						await PeerConnection.sendConnection(senderId, {
							type: "rollback response",
							action: "complete",
						});

						console.log(
							"UTXO shard has successfully unlocked the inputHashes"
						);
					}
					break;

				case "commit":
					{
						// update UHS by deleting inputHashes & adding outputHashes
						PeerConnection.sendConnection(senderId, {
							type: "commit response",
							action: "complete",
						});

						console.log("Transaction commit complete");
					}
					break;
			}
		}
	});
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
