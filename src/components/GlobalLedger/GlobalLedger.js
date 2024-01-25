import PeerConnection from "../../peer";
import nodeIds from "../../Ids";
import DAG from "./DAG";

const transactionManagerId = nodeIds["transaction manager"].id;

const dag = new DAG();

export const handleIncomingConnection = (connection) => {
	const senderId = connection.peer;

	if (senderId === transactionManagerId) {
		PeerConnection.onConnectionReceiveData(
			senderId,
			async (transactionData) => {
				switch (transactionData.type) {
					case "validate transaction":
						{
							const isValid =
								dag.validateTransaction(transactionData);

							await PeerConnection.sendConnection(senderId, {
								type: "validation result",
								success: isValid,
								transactionId: transactionData.transactionId,
							});

							console.log(
								"Transaction validated with result: ",
								isValid
							);
						}
						break;

					case "transaction validated":
						{
							console.log("global ledger updation started");

							dag.addTransaction(transactionData);

							await PeerConnection.sendConnection(senderId, {
								type: "ledger updated",
								transactionId: transactionData.transactionId,
							});
						}
						break;
				}
			}
		);
	}
};
