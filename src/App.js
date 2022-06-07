import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Modal from 'react-modal';

let contract_address = "0x4e31878B7676E24CA3EA0Ceb37b65F8da1761559"; // 60 seconds
// let contract_address = "0x86F79c9df6FfD26EcE0a2C9Beb1156926Da908ee"; // goerli demo 01/06
// let contract_address = "0xaFa244BDCf4915100f23bAb9655F93108543FC39"; // goerli
// let contract_address = "0xC2d904d39ceF1dd381e2c8Ebe871CB74437fA6b4"; // 60 seconds
// let contract_address = "0x3b34C5848D6FE80C719E7DB54490823258fB5BE6";
// let token_address = "0x434E80DB12dABbCFa0f4e1742AF5ACf5c6978bE1"; // 60 seconds
// let token_address = "0x00Bfb053c776AD912FE3aA3Cc051C2488CD51a77"; // goerli
// let token_address = "0x5CC1868e94EA2Fabd8B2EC893D563db0116a07A2";
const web3 = require('web3');
let avatars = ["👨‍🦱", "👩‍🦰", "👩‍🍳", "🧑‍🍳", "👩‍🎓", "🧑‍🎓", "🧍‍♀️", "🧍"];
const tcrABI = require("./abis/Tcr.json").abi;
const tokenABI = require("./abis/Token.json").abi;
const customStyles = {
	content: {
		top: '50%',
		left: '50%',
		right: 'auto',
		bottom: 'auto',
		marginRight: '-50%',
		transform: 'translate(-50%, -50%)',
	},
};
Modal.setAppElement('#root');

function App() {
	const [account, setaccount] = useState("0x0");
	const [provider, setProvider] = useState(null);
	const [tcr, setTCR] = useState(null);
	const [token, setToken] = useState(null);
	const [listings, setListings] = useState([]);
	const [newlistingname, setNewListingName] = useState("");
	const [commitStageLen, setCommitStageLen] = useState(0);
	const [av, setAv] = useState([]);
	const [modalIsOpen, setIsOpen] = useState(false);
	const [currentAllowance, setCurrentAllowance] = useState(0);
	const [requiredAllowance, setRequiredAllowance] = useState(0);
	const [currentPaidAction, setCurrentPaidAction] = useState("propose");
	const [currentChallengedListing, setCurrentChallengedListing] = useState("");
	const [currentVotedListing, setCurrentVotedListing] = useState("");

	const [guild, setGuild] = useState({
		name: "",
		tokenAddress: "0x0",
		minDeposit: 0, // proposal stake
		applyStageLen: 0,  // proposal timeout (seconds)
		commitStageLen: 0, // challenge/votting session timeout (seconds)
	});

	const updateListings = async () => {
		const signer = provider.getSigner(0);
		let connected = await tcr.connect(signer);
		let ls = await connected.getAllListings();
		let tmp = [];
		if (commitStageLen === 0) {
			let c = await connected.getDetails();
			setCommitStageLen(Number(c[4].toString()));
		}
		ls = ls.filter(item => item);
		for (const [i, L] of ls.entries()) {
			let newAvatar = avatars[Math.floor(Math.random() * avatars.length)]

			if (av[i] === undefined) {
				setAv([...av, newAvatar])
			}

			// await tcrInstance.updateStatus(web3.utils.fromAscii(L));
			const d = await connected.getListingDetails(ethers.utils.hexZeroPad(web3.utils.asciiToHex(L), 32));
			let connectedT = await token.connect(signer);
			let balance = await connectedT.balanceOf(d[1])
			let canBeWL = await connected.canBeWhitelisted(ethers.utils.hexZeroPad(web3.utils.asciiToHex(L), 32))
			let status = "under-review";
			if (d[0] === false) {
				if (Number(d[3].toString()) > 0) {
					status = "challenged"
				}
			} else {
				status = "approved";
			}
			let detail = {
				name: d[5],
				applicationExpiry: Number(d[4].toString()),
				whitelisted: d[0],
				owner: d[1],
				challengeId: d[3],
				balance: balance.toNumber(),
				canBeWL: canBeWL,
				status,
				avatar: newAvatar
			}
			tmp.push(detail);
		}
		setListings(tmp);
	}
	useEffect(() => {
		(async function () {
			if (provider) {
				console.log('Guild details:', guild)
				console.log(currentAllowance, guild.minDeposit)

				await updateListings()
			}
		})();
	}, [tcr])

	useEffect(() => {
		if (!window.ethereum) {
			// Nothing to do here... no ethereum provider found
			return;
		}
		const accountWasChanged = (accounts) => {
			setaccount(accounts[0]);
			console.log("accountWasChanged");
		};
		const getAndSetAccount = async () => {
			const changedAccounts = await window.ethereum.request({ method: "eth_requestAccounts" });
			setaccount(changedAccounts[0]);
			console.log("getAndSetAccount");
		};
		const clearAccount = () => {
			setaccount("0x0");
			console.log("clearAccount");
		};
		window.ethereum.on("accountsChanged", accountWasChanged);
		window.ethereum.on("connect", getAndSetAccount);
		window.ethereum.on("disconnect", clearAccount);
		window.ethereum.request({ method: "eth_requestAccounts" }).then(
			(accounts) => {
				console.log("accounts", accounts);
				setProvider(new ethers.providers.Web3Provider(window.ethereum, "any"));
				setaccount(accounts[0]);

				// No need to set account here, it will be set by the event listener
			},
			(error) => {
				// Handle any UI for errors here, e.g. network error, rejected request, etc.
				// Set state as needed
			}
		);
	}, []);

	useEffect(() => {
		(async function () {
			if (provider) {
				console.log('Provider', provider)
				const signer = provider.getSigner(0);
				let t = new ethers.Contract(contract_address, tcrABI, provider);
				let connected_tcr = await t.connect(signer);
				let details = await connected_tcr.getDetails();
				setGuild({
					name: details[0],
					tokenAddress: details[1],
					minDeposit: Number(details[2].toString()),
					applyStageLen: Number(details[3].toString()),
					commitStageLen: Number(details[4].toString()),
				});
				setTCR(t);
				let tk = new ethers.Contract(details[1], tokenABI, provider);
				setToken(tk);

				let allowance = await getAllowance(provider, account, t, tk);
				setCurrentAllowance(allowance);
			}
		})();
	}, [provider, account]);
	function openModal() {
		setIsOpen(true);
	}

	function afterOpenModal() {
		// references are now sync'd and can be accessed.
	}

	function closeModal() {
		setIsOpen(false);
	}
	const StakeButton = props => {
		return (
			<button onClick={
				async () => {
					await stake(props.provider, props.tcr, props.token, props.guild.minDeposit);
					const signer = provider.getSigner(0);

					let connected_tcr = await tcr.connect(signer);
					let connected_token = await token.connect(signer);
					connected_token.once("Approval", (_owner, _spender, _amount) => {
						console.log('event arguments', _owner, _spender, Number(_amount.toString()));
						setCurrentAllowance(Number(_amount.toString()));
					});

				}
			} >Stake {props.guild.minDeposit}</button>
		);

	}
	return (
		<div className="App">
			<Modal
				isOpen={modalIsOpen}
				onAfterOpen={afterOpenModal}
				onRequestClose={closeModal}
				style={customStyles}
				contentLabel="Warning"
			>
				<div>
					<p>
						You must approve {requiredAllowance} token before continuing
					</p>
					<button onClick={
						async () => {
							const signer = provider.getSigner(0);
							let connected_tcr = await tcr.connect(signer);
							let connected_token = await token.connect(signer);
							await connected_token.approve(connected_tcr.address, requiredAllowance);
							switch (currentPaidAction) {
								case "propose":
									await connected_tcr.propose(ethers.utils.hexZeroPad(web3.utils.fromAscii(newlistingname), 32), 100, newlistingname, { from: signer.address });
									break;
								case "challenge":
									await connected_tcr.challenge(ethers.utils.hexZeroPad(web3.utils.fromAscii(currentChallengedListing), 32), 100);
									break;
								case "vote":
									await connected_tcr.vote(ethers.utils.hexZeroPad(web3.utils.fromAscii(currentChallengedListing), 32), 10);
									break;
								default: break;

							}
							setNewListingName("")
							closeModal();
						}
					}>Approve</button>
					<button onClick={closeModal}>Close</button>

				</div></Modal>
			<header className="App-header">
				<p>
					Current account {account}
				</p>

			</header>
			<div>
				<p>Current Listings</p>

				<div >
					<div className="row" key={"a"}>
						<div className="column"><b>Avatar</b></div>
						<div className="column"><b>Name</b></div>
						<div className="column"><b>Approval status</b></div>
						<div className="column"><b>Time left (s)</b></div>
						<div className="column"><b>Challenge proposal</b></div>
						<div className="column"><b>Challenge Id</b></div>
						<div className="column"><b>Vote 10 for</b></div>
						<div className="column"><b>Vote 10 against</b></div>
						<div className="column"><b>Update status</b></div>
						<div className="column"><b>Proposer address</b></div>
						<div className="column"><b>Token balance</b></div>
					</div>
					<hr></hr>
					{(listings.length > 0) && listings.map((l, i) => <div className="row" key={i}>
						<div className="column">{l.avatar}</div>
						<div className="column">{l.name} </div>
						<div className="column">{l.status}</div>
						<div className="column">{
							(function () {

								if (Number(l.challengeId.toString()) > 0 && l.status !== "approved") {
									if ((commitStageLen * 1000 + (l.applicationExpiry * 1000) - Date.now()) <= 0) {
										return "expired";
									} else {
										return String(Math.floor(commitStageLen + ((l.applicationExpiry * 1000) - Date.now()) / 1000));
									}
								}
								else if (Number(l.challengeId.toString()) > 0 && l.status === "approved") {

									return String((new Date(l.applicationExpiry * 1000) - Date.now() <= 0 ? "expired" : Math.floor((new Date(l.applicationExpiry * 1000 + 7200000) - Date.now()) / 1000)))
								} else if (Number(l.challengeId.toString()) === 0 && l.status === "approved") {
									return "expired"
								} else { // (Number(l.challengeId.toString()) === 0 && l.status !== "approved")
									if ((Math.floor(((l.applicationExpiry * 1000) - Date.now()) / 1000)) <= 0) {
										return "expired"
									}
									else {
										return String(Math.floor(((l.applicationExpiry * 1000) - Date.now()) / 1000));
									}
								}

							})()

							// Number(l.challengeId.toString()) > 0  && l.status !== "approved" ? 
							// (commitStageLen*1000000 + new Date(l.applicationExpiry * 1000) - Date.now() <= 0 ? "expired" : Math.floor(commitStageLen + (new Date(l.applicationExpiry * 1000) - Date.now()) / 1000))
							//  :
							//  (new Date(l.applicationExpiry * 1000) - Date.now() <= 0 ? "expired" : Math.floor((new Date(l.applicationExpiry * 1000) - Date.now()) / 1000)) 

						}
						</div>
						<div className="column">{(l.whitelisted == false && Number(l.challengeId.toString()) === 0) && currentAllowance >= guild.minDeposit ? <button onClick={async () => {
							const signer = provider.getSigner(0);
							let connected = await tcr.connect(signer);
							try {
								setCurrentPaidAction("challenge")
								if (currentAllowance < 100) {
									setRequiredAllowance(100)
									openModal();
								} else {
									try {
										await connected.challenge(ethers.utils.hexZeroPad(web3.utils.fromAscii(l.name), 32), 100);
									} catch (e) {
										console.log('challenge exception', e.data.message);
										alert(e.data.message)
									}
								}
							} catch (e) {
								console.log(e);
							}
						}}>Challenge</button> : (l.whitelisted === false ? <div><StakeButton guild={guild} provider={provider} account={account} tcr={tcr} token={token} amount={guild.minDeposit} /></div> : <div>.</div>)}</div>
						<div className="column">{l.challengeId.toString()}</div>
						<div className="column">{l.whitelisted === false && Number(l.challengeId.toString()) > 0 && currentAllowance >= 10 ? <button onClick={async () => {
							const signer = provider.getSigner(0);
							let connected = await tcr.connect(signer);
							try {
								setCurrentPaidAction("vote")

								let transaction = await connected.vote(ethers.utils.hexZeroPad(web3.utils.fromAscii(l.name), 32), 10, true);
								let tx = await transaction.wait()
								console.log('tx', tx)
								let event = tx.events[0];
								console.log('event for', event);

							} catch (e) {
								console.log(e);
								alert(e.data.message);
							}
						}}>Vote For</button> : (l.whitelisted === false && Number(l.challengeId.toString()) > 0 ? <div><StakeButton guild={guild} provider={provider} account={account} tcr={tcr} token={token} amount={10} /></div> : <div>.</div>)}</div>
						<div className="column">{l.whitelisted === false && Number(l.challengeId.toString()) > 0 && currentAllowance >= 10 ? <button onClick={async () => {
							const signer = provider.getSigner(0);
							let connected = await tcr.connect(signer);
							try {
								setCurrentPaidAction("vote")

								let transaction = await connected.vote(ethers.utils.hexZeroPad(web3.utils.fromAscii(l.name), 32), 10, false);
								let tx = await transaction.wait()
								console.log('tx', tx)
								let event = tx.events[0];
								console.log('event against', event);

							} catch (e) {
								console.log(e);
								alert(e.data.message);

							}
						}}>Vote Against</button> : (l.whitelisted === false && Number(l.challengeId.toString()) > 0 ? <div><StakeButton guild={guild} provider={provider} account={account} tcr={tcr} token={token} amount={10} /></div> : <div>.</div>)}</div>
						<div className="column">{!l.whitelisted && (l.canBeWL || (!l.canBeWL && (Number(l.challengeId.toString()) > 0)) || l.status === "under-review") ? <button onClick={
							async () => {
								const signer = provider.getSigner(0);
								let connected = await tcr.connect(signer);
								console.log(Number(l.challengeId.toString()))
								try {
									await connected.updateStatus(ethers.utils.hexZeroPad(web3.utils.fromAscii(l.name), 32));
								} catch (e) {
									console.log(e);
								}
							}
						}>Update status</button> : <div>.</div>}
						</div>
						<div className="column">{l.owner.substring(0, 6)}</div>
						<div className="column">{l.balance / 1000.0}</div>
					</div>)}</div>
				<hr />
				<div><button className="button" onClick={async () => {
					await updateListings();
				}}>Update Listings</button></div>
			</div>
			<hr />
			<div>
				<p>New listing proposal</p>
				<input value={newlistingname}
					onChange={(e) => {
						setNewListingName(e.target.value);
					}}
				/>
				<p>{newlistingname !== "" && currentAllowance >= guild.minDeposit ? (<button onClick={
					async () => {
						setCurrentPaidAction("propose");
						console.log('onClick proposing', currentAllowance);
						const signer = provider.getSigner(0);
						let allowance = await getAllowance(provider, account, tcr, token);
						let connected_tcr = await tcr.connect(signer);
						console.log('Proposing...', newlistingname, web3.utils.asciiToHex(newlistingname))
						await connected_tcr.propose(ethers.utils.hexZeroPad(web3.utils.fromAscii(newlistingname), 32), guild.minDeposit, newlistingname, { from: signer.address })
						setNewListingName("");
						setCurrentAllowance(allowance);
					}
				}>Propose Listing</button>) : <StakeButton guild={guild} provider={provider} account={account} tcr={tcr} token={token} amount={guild.minDeposit} />}</p>
			</div>
			<hr />

		</div>
	);
}

async function stake(provider, tcr, token, amount) {
	const signer = provider.getSigner(0);
	let connected_tcr = await tcr.connect(signer);
	let connected_token = await token.connect(signer);
	await connected_token.approve(connected_tcr.address, amount);

}
async function getAllowance(provider, current_address, tcr, token) {
	try {
		const signer = provider.getSigner(0);
		let connected = await tcr.connect(signer);

		let connected_token = await token.connect(signer);
		let allowance = await connected_token.allowance(current_address, connected.address);
		console.log('allowance', current_address, connected.address, allowance.toString());
		return Number(allowance.toString());
	} catch (e) {
		console.log('checkallowance error:', e);
	}
}

export default App;
// under-review - approved 

