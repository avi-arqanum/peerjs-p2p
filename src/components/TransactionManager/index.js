import { useEffect } from "react";
import PeerConnection from "../../peer";
import { handleUserConnection } from "./User";
import nodeIds from "../../Ids";

const transactionManagerId = nodeIds["transaction manager"].id;

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
