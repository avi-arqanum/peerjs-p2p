import nodeIds from "../../Ids";
import PeerConnection from "../../peer";
import { veto } from "./TransactionManager";

const globalLedgerId = nodeIds.global.id;

export const handleGlobalLedgerValidation = async (
	transactionData,
	transactionId
) => {
	const globalValidationCompletePromise = new Promise(async (resolve) => {
		await PeerConnection.connectPeer(globalLedgerId);

		await PeerConnection.sendConnection(globalLedgerId, {
			type: "transaction validation",
			...transactionData,
			transactionId,
		});

		PeerConnection.onConnectionReceiveData(globalLedgerId, (data) => {
			switch (data.type) {
				case "validation result":
					{
						veto.updateVotes(transactionId, data.success);
						console.log(
							"global ledger validation result",
							data.success ? "valid" : "invalid"
						);

						resolve();
					}
					break;
			}
		});
	});

	await globalValidationCompletePromise;
};

export const handleGlobalLedgerUpdate = async (
	transactionData,
	transactionId
) => {
	const globalLedgerUpdatePromise = new Promise(async (resolve) => {
		await PeerConnection.sendConnection(globalLedgerId, {
			type: "transaction validated",
			...transactionData,
			transactionId,
		});

		PeerConnection.onConnectionReceiveData(globalLedgerId, (data) => {
			if (data.type === "ledger updated" && data.success === true) {
				console.log("Global ledger is updated!");
				resolve();
			}
		});
	});

	await globalLedgerUpdatePromise;
};
