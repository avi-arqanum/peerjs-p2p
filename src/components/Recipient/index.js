import React, { useEffect } from "react";
import PeerConnection from "../../peer";

import "./styles.css";

const transactionManagerId =
	"5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9";

const recipientPublicKey =
	"d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35";

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

		PeerConnection.onConnectionReceiveData(senderId, (transactionData) => {
			if (senderId === transactionManagerId) {
				console.log("Transaction manager has sent data");

				// update merkle patricia trie

				setTimeout(async () => {
					await PeerConnection.sendConnection(transactionManagerId, {
						type: "payment updated",
						success: true,
					});
					console.log("Payment received & ledger updated");
				}, 1000);
			}
		});
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
