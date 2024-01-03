import { useEffect } from "react";
import PeerConnection from "../../peer";

const transactionManagerId =
	"5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9";

const validatorId =
	"4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce";

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

		PeerConnection.onConnectionReceiveData(senderId, (data) => {
			if (senderId === transactionManagerId) {
				console.log("Transaction manager has sent data for validation");

				// validation logic - access merkle patricia trie
				const isValid = true;
				PeerConnection.sendConnection(senderId, {
					...data,
					type: "validation result",
					success: isValid,
				});

				console.log("Transaction validated and sent back to manager");
			}
		});
	};
};

export default Validator;
