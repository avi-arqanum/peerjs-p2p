import { useEffect } from "react";
import PeerConnection from "../../peer";
import { handleUserConnection } from "./User";

const transactionManagerId =
	"5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9";

const TransactionManager = () => {
	useEffect(() => {
		const initializeConnection = async () => {
			try {
				await PeerConnection.startPeerSession(transactionManagerId);
				PeerConnection.onIncomingConnection(handleUserConnection);
			} catch (error) {
				console.log("Error initializing transaction manager", error);
			}
		};

		initializeConnection();
	}, []);
};

export default TransactionManager;
