import React, { useEffect } from "react";
import PeerConnection from "../../peer";
import nodeIds from "../../Ids";

import "./styles.css";

const transactionManagerId = nodeIds["transaction manager"].id;
const recipientPublicKey = nodeIds["recipient"].id;

const User = () => {
	useEffect(() => {
		const initializeUser = async () => {
			try {
				await PeerConnection.startPeerSession(recipientPublicKey);
				PeerConnection.onIncomingConnection(handleIncomingConnection);
			} catch (error) {
				console.error(
					"Initialization or handling incoming connection failed:",
					error
				);
			}
		};

		initializeUser();
	}, []);

	const handleIncomingConnection = (incomingConnection) => {
		const senderId = incomingConnection.peer;

		PeerConnection.onConnectionReceiveData(
			senderId,
			async (transactionData) => {
				if (senderId === transactionManagerId) {
					console.log(
						"Transaction manager has asked to update received UTXOs"
					);

					// update merkle patricia trie

					await PeerConnection.sendConnection(transactionManagerId, {
						type: "payment updated",
						success: true,
					});
					console.log("Ledger updated & sent back to manager");
				}
			}
		);
	};

	return (
		<div className="form_container">
			<form action="" className="form-group form">
				<label className="form-label">Reciever public key:</label>
				<input
					type="text"
					placeholder="64 digit hexadecimal string"
					className="form-control mb-2"
				/>

				<label className="form-label">Payment amount:</label>
				<input
					type="number"
					placeholder="200"
					className="form-control mb-4"
				/>

				<div className="button_container">
					<button type="submit" className="btn btn-primary">
						Send
					</button>
				</div>
			</form>
		</div>
	);
};

export default User;
