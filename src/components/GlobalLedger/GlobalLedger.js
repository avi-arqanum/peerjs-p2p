import PeerConnection from "../../peer";
import nodeIds from "../../Ids";
import DAG from "./DAG";

const transactionManagerId = nodeIds["transaction manager"].id;

const dag = new DAG();

var transactionData = {
	transactionId: "transactionId1",
	inputUtxos: [],
	outputUtxos: [
		{
			transactionId: "transactionId1",
			outputIndex: 0,
			amount: 7.5,
			publicKey: nodeIds.sender.id,
		},
		{
			transactionId: "transactionId1",
			outputIndex: 1,
			amount: 7.5,
			publicKey: nodeIds.sender.id,
		},
	],
};

dag.addTransaction(transactionData);

export const handleIncomingConnection = (connection) => {
	const senderId = connection.peer;

	if (senderId === transactionManagerId) {
		PeerConnection.onConnectionReceiveData(
			senderId,
			async (transactionData) => {
				console.log(transactionData);

				switch (transactionData.type) {
					case "transaction validation":
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

							await PeerConnection.sendConnection(
								transactionManagerId,
								{
									type: "ledger updated",
									success: true,
									transactionId:
										transactionData.transactionId,
								}
							);

							console.log("Global ledger updated");
						}
						break;
				}
			}
		);
	}
};
