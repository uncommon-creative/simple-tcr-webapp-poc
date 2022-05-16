import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from "react";
import { ethers } from "ethers";
let contract_address = "0xa0C7ED306A952a1F3866a8924BEb6E43bd983192";
let token_address = "0x81956a57C71Aad209fCaa5c549C558DB95f86b00";
const web3 = require('web3');

const tcrABI = require("./abis/Tcr.json").abi;
const tokenABI = require("./abis/Token.json").abi;

function App() {
	const [account, setaccount] = useState("0x0");
	const [provider, setProvider] = useState(null);
	const [tcr, setTCR] = useState(null);
	const [token, setToken] = useState(null);
	const [listings, setListings] = useState([]);
	const [newlistingname, setNewListingName] = useState("");

	const updateListings = async () => {
		const signer = provider.getSigner(0);
		let connected = await tcr.connect(signer);
		let ls = await connected.getAllListings();
		let tmp = [];
		console.log('Listings', ls);
		ls = ls.filter(item => item);
		for (const L of ls) {
			console.log(L)

			// await tcrInstance.updateStatus(web3.utils.fromAscii(L));
			const d = await connected.getListingDetails(ethers.utils.hexZeroPad(web3.utils.asciiToHex(L), 32));
			let connectedT = await token.connect(signer);
			let balance = await connectedT.balanceOf(d[1])
			console.log(L)
			let canBeWL = await connected.canBeWhitelisted(ethers.utils.hexZeroPad(web3.utils.asciiToHex(L), 32))
			console.log(d);
			let status = "under-review";
			if (d[0] === false) {
				if (Number(d[3].toString()) > 0) {
					status = "challenged"
				}
			} else {
				status = "approved";
			}
			let detail = {
				name: d[4],
				whitelisted: d[0],
				owner: d[1],
				challengeId: d[3],
				balance: balance.toNumber(),
				canBeWL: canBeWL,
				status
			}
			tmp.push(detail);
		}
		console.log(JSON.stringify(tmp))
		setListings(tmp);
	}
	useEffect(() => {
		(async function () {
			if (provider) {
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
		if (provider) {
			console.log('Provider', provider)
			const signer = provider.getSigner(0);
			let t = new ethers.Contract(contract_address, tcrABI, provider);
			setTCR(t);
			let tk = new ethers.Contract(token_address, tokenABI, provider);
			setToken(tk);
		}
	}, [provider, account]);

	return (
		<div className="App">
			<header className="App-header">
				<p>
					Current account {account}
				</p>

			</header>
			<div>
				<p>Current Listings</p>

				<div >
					<div className="row" key={"a"}>
						<div className="column"><b>Name</b></div>
						<div className="column"><b>Approval status</b></div>
						<div className="column"><b>Challenge proposal</b></div>
						<div className="column"><b>Challenge Id</b></div>
						<div className="column"><b>Vote for</b></div>
						<div className="column"><b>Vote against</b></div>
						<div className="column"><b>Update status</b></div>
						<div className="column"><b>Proposer address</b></div>
						<div className="column"><b>Token balance</b></div>
					</div>
					<hr></hr>
					{(listings.length > 0) && listings.map((l, i) => <div className="row" key={i}>
						<div className="column">{l.name} </div>
						<div className="column">{l.status}</div>
						<div className="column">{(l.whitelisted == false && Number(l.challengeId.toString()) === 0) ? <button onClick={async () => {
							const signer = provider.getSigner(0);
							let connected = await tcr.connect(signer);
							try {
								let connected_token = await token.connect(signer);
								console.log('approving...', connected.address, 100);
								await connected_token.approve(connected.address, 100);
								await connected.challenge(ethers.utils.hexZeroPad(web3.utils.fromAscii(l.name), 32), 100);
							} catch (e) {
								console.log(e);
							}
						}}>Challenge</button> : <div>.</div>}</div>
						<div className="column">{l.challengeId.toString()}</div>
						<div className="column">{l.whitelisted === false && Number(l.challengeId.toString()) > 0 ? <button onClick={async () => {
							const signer = provider.getSigner(0);
							let connected = await tcr.connect(signer);
							try {
								let connected_token = await token.connect(signer);
								console.log('approving...', connected.address, 10);
								await connected_token.approve(connected.address, 10);
								await connected.vote(ethers.utils.hexZeroPad(web3.utils.fromAscii(l.name), 32), 10, true);
							} catch (e) {
								console.log(e);
							}
						}}>Vote For</button> : <div>.</div>}</div>
						<div className="column">{l.whitelisted === false && Number(l.challengeId.toString()) > 0 ? <button onClick={async () => {
							const signer = provider.getSigner(0);
							let connected = await tcr.connect(signer);
							try {
								let connected_token = await token.connect(signer);
								console.log('approving...', connected.address, 10);
								await connected_token.approve(connected.address, 10);
								await connected.vote(ethers.utils.hexZeroPad(web3.utils.fromAscii(l.name), 32), 10, false);
							} catch (e) {
								console.log(e);
							}
						}}>Vote Against</button> : <div>.</div>}</div>
						<div className="column">{!l.whitelisted && (l.canBeWL || (!l.canBeWL && (Number(l.challengeId.toString()) > 0))) ? <button onClick={
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
						<div className="column">{l.balance}</div>
					</div>)}</div>
				<hr />
				<div><button className="button" onClick={async () => {
					await updateListings();
				}}>Update Listings</button></div>
			</div>
			<hr />
			<div>
				<p>New listing proposal</p>
				<input
					onChange={(e) => {
						setNewListingName(e.target.value);
					}}
				/>
				<p>{newlistingname !== "" && <button onClick={
					async () => {
						const signer = provider.getSigner(0);
						let connected_tcr = await tcr.connect(signer);
						let connected_token = await token.connect(signer);
						console.log('approving...', connected_tcr.address, 100);
						await connected_token.approve(connected_tcr.address, 100);
						console.log('Proposing...', newlistingname, web3.utils.asciiToHex(newlistingname))
						await connected_tcr.propose(ethers.utils.hexZeroPad(web3.utils.fromAscii(newlistingname), 32), 100, newlistingname, { from: signer.address })
						setNewListingName("")
					}
				}>Propose Listing</button>}</p>
			</div>
			<hr />

		</div>
	);
}

export default App;
// under-review - approved 

