import { useEffect } from "react";
import PeerConnection from "../../peer";
import nodeIds from "../../Ids";

const transactionManagerId = nodeIds["transaction manager"].id;
const validatorId = nodeIds["validator"].id;

const Validator = () => {
	useEffect(() => {
		const initializeConnection = async () => {
			await PeerConnection.startPeerSession(validatorId);
			PeerConnection.onIncomingConnection(handleIncomingConnection);
		};

		initializeConnection();
	}, []);

	const handleIncomingConnection = (connection) => {
		const senderId = connection.peer;

		if (senderId === transactionManagerId) {
			PeerConnection.onConnectionReceiveData(senderId, (data) => {
				switch (data.type) {
					case "transaction validation":
						{
							console.log(
								"Transaction manager has sent data for validation"
							);

							// validation logic - access merkle patricia trie
							const isValid = true;
							PeerConnection.sendConnection(senderId, {
								...data,
								type: "validation result",
								success: isValid,
							});

							console.log(
								"Transaction validated and sent back to manager"
							);
						}
						break;

					case "ledger update":
						{
							console.log(
								"Transaction manager has asked to update ledger"
							);

							// updation logic - update merkle patricia trie

							PeerConnection.sendConnection(senderId, {
								...data,
								type: "ledger updated",
								success: true,
							});

							console.log("ledger updated & sent back to TM");
						}
						break;
				}
			});
		}
	};
};

export default Validator;
