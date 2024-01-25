import { useEffect } from "react";
import PeerConnection from "../../peer";
import { handleIncomingConnection } from "./GlobalLedger";

import nodeIds from "../../Ids";

const globalId = nodeIds.global.id;

const GlobalLedger = () => {
	useEffect(() => {
		const initializeGlobalLedger = async () => {
			try {
				await PeerConnection.startPeerSession(globalId);
				PeerConnection.onIncomingConnection(handleIncomingConnection);
			} catch (error) {
				console.error("Initialization failed:", error);
			}
		};
		initializeGlobalLedger();
	}, []);
};

export default GlobalLedger;
