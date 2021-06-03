const express = require('express');
const app = express();
const path = require('path');

var http = require('http').createServer(app);
var io = require('socket.io')(http);

const suits = ["red", "yellow", "black", "green"];
const values = ["1","5","6","7","8","9","10","11","12","13","14"];

var users = [];
var lobbies = [];

let numUsers = 0;



class Card{
	constructor(value, suit){
		this.value = value;
		this.suit = suit;
	}
}


class Deck{
	constructor(suits, values){
		this.cards = new Array();
	
		for(var i = 0; i < suits.length; i++)
		{
			for(var x = 0; x < values.length; x++)
			{
				var card = {Value: values[x], Suit: suits[i]};
				this.cards.push(new Card(values[x],suits[i]));
			}
		}
	
		this.cards.push(new Card("rook","rook"));

		
	}
	shuffle(){
		for (var i = 0; i < 1000; i++){
			var location1 = Math.floor((Math.random() * this.cards.length));
			var location2 = Math.floor((Math.random() * this.cards.length));
			var tmp = this.cards[location1];

			this.cards[location1] = this.cards[location2];
			this.cards[location2] = tmp;
		}
	}
}


class Player{
	constructor(sid, uid, username){
		this.sid = sid;
		this.uid = uid;
		this.username = username;
		this.hand = [];
		this.bid = 0;
		this.won = []; //array of cards
		this.roundPoints = 0;
		this.points = 0;
		this.passed = false;
		this.partner = false;
		this.inLobby = false; //used when player reloads to find game state
		this.inGame = false; //used when player reloads to find game state
	}
	addWon(wonparam){
		for(var i = 0; i < wonparam.length; i++){
			this.won.push(wonparam[i]);
		}
	}
	setturnorder(turnnum){
		this.turnnum = turnnum;
	}
	clearHand(){
		this.hand = [];		
	}
}

class hiddenPlayer{ 
	constructor(username, orderNum, points){
		this.username = username;
		this.orderNum = orderNum;
		this.points = points;
	}
}

class Game{
	constructor(players){
		this.status;
		this.players = players;
		this.deck = new Deck(suits,values);
		this.kitty = [];
		this.turn = 0;
		this.highestBidder = 0;
		this.currentBid = 0;
		this.bidding = true;
		this.passed = [];
		this.trump = 0;
		this.partnerArray = [];
		this.trickColor = 0;
		this.trickStarted = false;
		this.currentTrickWinner = 0;
		this.trickCards = [];
		this.over = false;
		this.winner = 0;
	}
	
	startGame(){
		//set turn order
		for (var i = 0; i < this.players.length; i++){
			this.players[i].setturnorder(i);
		}

		this.beginRound();
	}

	deal(){
		var playerNum = 0;

		//clear player hands and kitty
		this.kitty = [];
		for (var i = 0; i < this.players.length; i++){
			this.players[i].clearHand();
		}


		for (var i = 0; i < this.deck.cards.length; i++){

			if (this.players.length == 3 && this.kitty.length < 6){
				this.kitty.push(this.deck.cards[i])
			}
			else if ((this.players.length == 4 || this.players.length == 5) && this.kitty.length < 5){
				this.kitty.push(this.deck.cards[i])
			}
			else if (this.players.length == 6 && this.kitty.length < 3){
				this.kitty.push(this.deck.cards[i])
			}
			else{

				if (playerNum == (this.players.length)){
					playerNum = 0;
				}

				this.players[playerNum].hand.push(this.deck.cards[i]);
				playerNum++;
			}
		}
	
	}

	order(){
		var playerOrder = [];
		for (var i = 0; i < this.players.length; i++){
			playerOrder.push(new hiddenPlayer(this.players[i].username, this.players[i].turnnum, this.players[i].points));
		}
		return playerOrder;
	}
	
	nextTurn(){
			
		if (this.turn > (this.players.length - 2)){
			this.turn = 0;
		}else{
			this.turn++;
		}

	}

	tallyScores(){
		var partnerPoints = 0;
		var nonPartnerPoints = 0;
		var partnersSucceeded = false;
		
		var shootTheMoon = true;
		var numWinners = 0;

		for (var i = 0; i < this.players.length; i++){

			if (this.players[i].won.length > 0){
				numWinners++;
			}

			for (var x = 0; x < this.players[i].won.length; x++){
				if (this.players[i].won[x].value == "rook"){
					this.players[i].roundPoints += 20;
				} else if (parseInt(this.players[i].won[x].value) == 5){
					this.players[i].roundPoints += 5;
				} else if (parseInt(this.players[i].won[x].value) == 10 || parseInt(this.players[i].won[x].value) == 14){
					this.players[i].roundPoints += 10;
				} else if (parseInt(this.players[i].won[x].value) == 1){
					this.players[i].roundPoints += 15;
				}

			}
			console.log(this.players[i].username + "'s rounds points: " + this.players[i].roundPoints)
			this.players[i].won = [];

			//if they are a partner, add their round points to the patner points
			if(this.players[i].partner){
				partnerPoints += this.players[i].roundPoints;
			}else{
				nonPartnerPoints += this.players[i].roundPoints;
			}
		}

		if (numWinners > 1){
			shootTheMoon = false;
		}

		if (partnerPoints >= this.currentBid && this.currentBid != 400){
			console.log("partners succeeded by winning " + partnerPoints + " points.")
			partnersSucceeded = true;
		}else if(this.currentBid == 400 && partnerPoints == 200 && shootTheMoon){
			console.log("partner succeeded in shooting the moon and claiming every trick.")
			partnersSucceeded = true;
		}else{
			console.log("partners failed to win " + this.currentBid + " points. They only got " + partnerPoints + " points.")
			partnersSucceeded = false;
		}

		for (var i = 0; i < this.players.length; i++){
			if (this.players[i].partner && this.currentBid == 400 && partnersSucceeded){
				this.players[i].points += 400;
			}if (this.players[i].partner && partnersSucceeded){
				this.players[i].points += partnerPoints;
			}else if (this.players[i].partner && !partnersSucceeded){
				this.players[i].points -= this.currentBid;
			}else if (!this.players[i].partner){
				this.players[i].points += nonPartnerPoints;
			}
			console.log(this.players[i].username + "'s final points: " + this.players[i].points)

			if (this.players[i].points >= 500){
				this.over = true;
				this.status = "over";
			}

		}

		//this will run if at least 1 person has more than 500 points. If more than 1 have more than 500, this will pick the highest points as the winner
		if (this.over){
			var prevHigh = 0;

			
			for (var i = 0; i < this.players.length; i++){  //this doesn't check for ties!
				if (this.players[i].points > prevHigh){
					prevHigh = this.players[i].points;
					this.winner = i;
				}
			}



			//alert players that the game is over
			io.to(socket.lobby.name).emit('game over', {
				winner: this.players[this.winner].username,
				points: this.players[this.winner].points,
				players: this.order(),
			});
			
			//reset player values
			for (var i = 0; i < this.players.length; i++){ 
				this.players[i].points
				this.players[i].hand = [];
				this.players[i].bid = 0;
				this.players[i].won = [];
				this.players[i].roundPoints = 0;
				this.players[i].points = 0;
				this.players[i].passed = false;
				this.players[i].partner = false;
			}


			//temp commented out. Can't use num users. can't access socket from within game
			// setTimeout(function(){
				
			// 	io.to(socket.lobby.name).emit('to lobby', {
			// 		numUsers: numUsers,
			// 		users: users
			// 	});

			// }, 15000);
			

		}


	}
	
	resetRound(){		
		if (!this.over){
			
			for (var i = 0; i < this.players.length; i++){
				//reset hand
				this.players[i].hand = [];
		
				//reset roundpoints
				this.players[i].roundPoints = 0;
				
				//reset partner
				this.players[i].partner = false;

				//reset passed
				this.players[i].passed = false;

				//reset bid
				this.players[i].bid = 0;

				//reset won cards
				this.players[i].won = [];
			}
			

			//resets game parameters
			this.deck = new Deck(suits,values);
			this.kitty = [];
			this.turn = 0; //figure out how to increment this
			this.highestBidder = 0;
			this.currentBid = 0;
			this.bidding = true;
			this.passed = [];
			this.trump = 0;
			this.partnerArray = [];
			this.trickColor = 0;
			this.trickStarted = false;
			this.currentTrickWinner = 0;
			this.trickCards = [];

		}
	}

	beginRound(){
		if (!this.over){
			//shuffle deck
			this.deck.shuffle();

			//deal cards
			this.deal();

			//send data back to clients
			for(var i = 0; i < this.players.length; i++){
				io.to(this.players[i].sid).emit('start bidding', {
					player: this.players[i], 
					order: this.order()
				});
			}
			this.status = "bidding";
		}
	}
}

class Lobby{
	constructor(lobby_name, lobby_capacity, lobby_privacy){
		this.name = lobby_name;
		this.capacity = lobby_capacity;
		this.private = lobby_privacy;
		this.participants = [];
		this.state = "Waiting for more players";
		this.game;
		this.updatePrelobby();
	}

	addParticipant(user){
		this.participants.push(user);
		this.updatePrelobby();
		this.updateParticipants();
		user.inLobby = true;
	}

	removeParticipant(user){
		for (var i = 0; i < this.participants.length; i++){
			if (this.participants[i].uid == user.uid){
				this.participants[i].inLobby = false;
				this.participants.splice(i, 1);
				this.updatePrelobby();
				this.updateParticipants();
			}
		}

		//remove lobby if there are no more participants
		if (this.participants.length == 0){
			console.log("all players have left lobby \"" + this.name + "\". Removing it from lobbies list.")
			this.destroyLobby();
		}
	}

	updatePrelobby(){
		io.to('prelobby').emit('lobby list', {
			lobbies: lobbies
		});
	}

	updateParticipants(){
		io.to(this.name).emit('new player in lobby', {
			numUsers: this.participants.length,
			users: this.participants
		});
	}

	destroyLobby(){
		lobbies.splice(findLobbyIndex(this.name), 1);
		this.updatePrelobby();
		this.updateParticipants();
	}
}

//finds user from socketID
function findUser(socketID){
	var user = null;
	for (var i = 0; i < users.length; i++){
		if (users[i].sid == socketID){
			user = users[i];
		}
	}
	return user;
}

//finds lobby from lobby name
function findLobby(lobby_name){
	var lobby = null;
	for (var i = 0; i < lobbies.length; i++){
		if (lobbies[i].name == lobby_name){
			lobby = lobbies[i]
		}
	}
	return lobby;
}

//find lobby index from lobby name
function findLobbyIndex(lobby_name){
	for (var i = 0; i < lobbies.length; i++){
		if (lobbies[i].name == lobby_name){
			return i;
		}
	}
}

function findLobbyFromUser(uid){
	for (var i = 0; i < lobbies.length; i++){
		for (let j = 0; j < lobbies[i].participants.length; j++){
			if (lobbies[i].participants[j].uid == uid){
				return lobbies[i];
			}
		}
		
	}
}


app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
	let addedUser = false;
	console.log('a user connected');
  
	//Login
	socket.on('login', (data) => {

		console.log("uid: " + data.uid);

		if (addedUser) return;


		var signedIn = false;
		for (var i = 0; i < users.length; i++){
			if (users[i].uid == data.uid){
				signedIn = true;
				socket.emit('already signed in');

				users[i].sid = socket.id;

				console.log("user already in users list.")
				console.dir(users[i]);
				
				//check if they're in a lobby or game
				if (users[i].inGame){
					console.log("user was in a game, sending them there now");
					var lobby = findLobbyFromUser(users[i].uid);
					if (lobby){
						var game = lobby.game;
						if (game){

						}
					}


				}else if (users[i].inLobby){
					console.log("user was in a lobby, sending them there now");

					var lobby = findLobbyFromUser(users[i].uid);
					if (lobby){

						socket.leave('prelobby');
						socket.join(lobby.name);
						socket.lobby = lobby;
	
						socket.emit('sent to lobby', {
							name: lobby.name,
							privacy: lobby.private,
							capacity: lobby.capacity
						});

						lobby.updateParticipants();

					}else{
						console.log("system thought user was in a lobby. We couldn't find them.");
					}


				}else{
					console.log("no apparent saved state, sending them to the prelobby.")
					signedIn = false; //this effectively accomplishes sending them to the prelobby.
				}

			}
		}

		if (!signedIn){
			
			//send user to prelobby
			console.log("sending " + data.username + " to prelobby");
			socket.join('prelobby');

			// we store the username in the socket session for this client
			socket.username = data.username; //I uncommented this because it's how the chat is getting the username without needing to compare it to the array of users.
		
			users.push(new Player(socket.id, data.uid, data.username));
			console.log("adding " + data.username + " to users list");
			numUsers++;
			
			addedUser = true;
			socket.emit('name accepted');

			socket.emit('lobby list', {
				lobbies: lobbies
			});
		}
	});
	
	//logout/disconnect
	socket.on('disconnect', () => {
		console.log('user disconnected');
		

		for (var i = 0; i < users.length; i++){
			if (users[i].sid == socket.id){
				console.log("user has disconnected. Here are their details.");
				console.dir(users[i]);
			}
		}


		//we need to update disconnect functionality.

		//remove user from users list
		// for( var i = 0; i < users.length; i++){ 
                                   
		// 	if (users[i].sid === socket.id) { 
		// 		users.splice(i, 1); 
		// 		i--; 
		// 	}
		// }
		//numUsers--;
		

		//
		// io.emit('logout', {
		// 	username: socket.username,
		// 	numUsers: numUsers,
		// 	users: users
		// });
		
	});


	//Lobby handling
	// when the client emits 'lobby list', this returns a list of the lobbies. Add support to return only non-private lobbies.
	socket.on('lobby list request', () => {
		socket.emit('lobby list', {
			lobbies: lobbies
		});
	});

	//client creates a new lobby
	socket.on('create lobby', (data) => {
		console.log("creating lobby name: " + data.lobby_name);
		var taken = false;
		for (var i = 0; i < lobbies.length; i++){
			if (lobbies[i].name == data.lobby_name){
				console.log("a user attempted to create a lobby with a name that was already taken");
				socket.emit('lobby name taken');
				taken = true;
				continue;
			}
		}

		if (!taken){
			console.log("creating lobby");
			lobbies.push(new Lobby(data.lobby_name, data.lobby_size, data.lobby_privacy));
			socket.emit("lobby created");
		}

	});


	//client joins a lobby
	socket.on('join lobby', (lobby_name) => {

		var user = findUser(socket.id);
		var foundUser = ((user) ? true : false);


		if (foundUser){

			var lobby = findLobby(lobby_name);
			var foundLobby = ((lobby) ? true : false);

			if (foundLobby){

				console.dir(lobby);

				socket.leave('prelobby');
				socket.join(lobby.name);
				socket.lobby = lobby;

				lobby.addParticipant(user);

				socket.emit('sent to lobby', {
					name: lobby.name,
					privacy: lobby.private,
					capacity: lobby.capacity
				});
	

	
			}else{
				console.log("lobby not found")	;
			}
		}else{
			console.log("user not found");
		}

	});

	//client leaves a lobby. Client sends the lobby_name. potential for problems from this.
	socket.on('leave lobby', (lobby_name) => {

		var user = findUser(socket.id);
		var foundUser = ((user) ? true : false);


		if (foundUser) {

			var lobby = findLobby(lobby_name);
			var foundLobby = ((lobby) ? true : false);

			if (foundLobby) {

				socket.emit('sent to prelobby');

				socket.leave(lobby.name);
				socket.join('prelobby');
				socket.lobby = undefined;

				lobby.removeParticipant(user);

			} else {
				console.log("lobby not found");
			}
		} else {
			console.log("user not found");
		}

	});

	socket.on('start game', () => {
		console.log('Game is starting');

		//set user states to inGame. Need to change this to false once the game is over.
		for (let i = 0; i < socket.lobby.participants; i++){
			socket.lobby.participants[i].inGame = true;
		}

		socket.lobby.game = new Game(socket.lobby.participants);
		socket.lobby.game.startGame();
		
	});
	
	socket.on('bid', (bid) => {
		//setup passed
		
		if (bid != "pass"){
			bid = parseInt(bid);
		}

		if(socket.id == socket.lobby.game.players[socket.lobby.game.turn].sid && socket.lobby.game.players[socket.lobby.game.turn].bid != "pass"){
			var biddingEnded = false;


				if((bid >= 80 && bid >= (socket.lobby.game.currentBid + 5) && bid <= 200) || bid === "pass" || bid == 400){


					if(bid === 'pass'){
						console.log("player has passed");
						socket.lobby.game.players[socket.lobby.game.turn].passed = true;
						socket.lobby.game.players[socket.lobby.game.turn].bid = "pass";
						socket.lobby.game.passed.push(socket.lobby.game.players[socket.lobby.game.turn].username);
						
						// This checks to see if everyone has passed. If so, it ends the bidding.
						if (socket.lobby.game.passed.length == (socket.lobby.game.players.length - 1)){ //potential problems: What if every passes on the first round? Does the last player get the bid for 80?
							console.log("bidding has ended");
							biddingEnded = true;
							
						}
						
					}else{
						if(bid == 400){
							biddingEnded = true;
						}

						socket.lobby.game.players[socket.lobby.game.turn].bid = bid;
						socket.lobby.game.highestBidder = socket.lobby.game.turn;//game.highestBidder = game.players[game.turn];
						socket.lobby.game.currentBid = bid;
					}

					socket.lobby.game.nextTurn();
					
					if (!biddingEnded){
						//send bid to other players as long as the bid process is still in progress
						
						while(socket.lobby.game.players[socket.lobby.game.turn].passed){//This skips passed people
					
							socket.lobby.game.nextTurn()
					
						}
						//game.highestBidder.username,
						io.to(socket.lobby.name).emit('bid placed', {
							currentBid: socket.lobby.game.currentBid,
							highestBidder: socket.lobby.game.players[socket.lobby.game.highestBidder].username,
							turn: socket.lobby.game.turn,
							order: socket.lobby.game.order(),
							passed: socket.lobby.game.passed
						});
					}else{
						//game.highestBidder.username
						io.to(socket.lobby.name).emit('bidding ended', {
							currentBid: socket.lobby.game.currentBid,
							highestBidder: socket.lobby.game.players[socket.lobby.game.highestBidder].username,
						});
						
						//set winner as partner
						socket.lobby.game.players[socket.lobby.game.highestBidder].partner = true;

						//add kitty to winner hand
						//game.highestBidder.hand.push(game.kitty[i]);
						for (var i = 0; i < socket.lobby.game.kitty.length; i++){
							socket.lobby.game.players[socket.lobby.game.highestBidder].hand.push(socket.lobby.game.kitty[i]);
						}
						//game.highestBidder.sid
						
						//determine how many partners should be called
						var numPartners = 0;
						if(socket.lobby.game.currentBid == 400){
							numPartners = 0;
						}else{
							numPartners = (Math.floor(socket.lobby.game.players.length/2) - 1);
						}
						//send kitty
						io.to(socket.lobby.game.players[socket.lobby.game.highestBidder].sid).emit('kitty contents', {
							kitty: socket.lobby.game.kitty,
							numPartners: numPartners						
						});

						

					}
					
				}else{
					console.log("bid too low, telling user to try again");
					io.to(socket.id).emit('bid too low');
					
				}
	
		}else{
			console.log("a player has tried to play out of turn");
			io.to(socket.id).emit('not your turn');
		}
	});


	socket.on('new kitty',(newKitty) =>{
		var pointsInKitty = false;
		if(newKitty.length == socket.lobby.game.kitty.length){
			socket.lobby.game.kitty = newKitty;

			//remove kitty from winner hand
			for (var i = 0; i < socket.lobby.game.kitty.length; i++){
				var kittyCard = new Card(socket.lobby.game.kitty[i].value, socket.lobby.game.kitty[i].suit);
					for (var x = 0; x < socket.lobby.game.players[socket.lobby.game.highestBidder].hand.length; x++){
						if (kittyCard.value == socket.lobby.game.players[socket.lobby.game.highestBidder].hand[x].value && kittyCard.suit == socket.lobby.game.players[socket.lobby.game.highestBidder].hand[x].suit){
							socket.lobby.game.players[socket.lobby.game.highestBidder].hand.splice(x, 1);		
						}
					}
			}

			//send new hand to winner
			io.to(socket.lobby.game.players[socket.lobby.game.highestBidder].sid).emit('new hand', socket.lobby.game.players[socket.lobby.game.highestBidder]);

			//determine if there are points in the kitty
			for(var i = 0; i < socket.lobby.game.kitty.length; i++){
				if(socket.lobby.game.kitty[i].value == 1 || socket.lobby.game.kitty[i].value == 14 || socket.lobby.game.kitty[i].value == 5 || socket.lobby.game.kitty[i].value == 10 || socket.lobby.game.kitty[i].value == 'rook' ){
					pointsInKitty = true;
					break;
				}
			}
			if(pointsInKitty){
				io.to(socket.lobby.name).emit('points in kitty');
			}else{
				io.to(socket.lobby.name).emit('no points in kitty');
			}

		}
		else{io.to(socket.lobby.game.players[socket.lobby.game.highestBidder].sid).emit('too few or too many cards in kitty');}
	})



	socket.on('partner', (partnerArray) =>{
		
		//check to make sure the sender is the highest bidder
		for (var i = 0; i < partnerArray.length; i++){
			var partner = new Card(partnerArray[i].value, partnerArray[i].suit);
			socket.lobby.game.partnerArray.push(partner);
		}
		console.log("Partners:")
		console.dir(socket.lobby.game.partnerArray)
	});

	socket.on('trump', (trumpColor) =>{
		//check to make sure the sender is the highest bidder
		console.dir(trumpColor);
		socket.lobby.game.trump = trumpColor;
		console.log("Trump Color: " + socket.lobby.game.trump);

		//this is currently starting playing cards section of the round
		console.log("final bid: " + socket.lobby.game.currentBid);

		socket.lobby.game.turn = socket.lobby.game.highestBidder;

		console.log("turn: " + socket.lobby.game.turn);

		io.to(socket.lobby.name).emit('round beginning', {
			trumpColor: socket.lobby.game.trump,
			partnerArray: socket.lobby.game.partnerArray,
			turn: socket.lobby.game.turn,
			order: socket.lobby.game.order(),
			highestBidder: socket.lobby.game.players[socket.lobby.game.highestBidder].username,
			currentBid: socket.lobby.game.currentBid
		});

	});


	socket.on('play card', (data) =>{

		console.dir(data);
		
		//check to make sure it's the senders turn
		console.log("curent player username: " + socket.lobby.game.players[socket.lobby.game.turn].username);
		console.log("curent player socket id: " + socket.lobby.game.players[socket.lobby.game.turn].sid);
		console.log("socket id: " + socket.id);

		if (socket.id == socket.lobby.game.players[socket.lobby.game.turn].sid){
			
			//var card = data.card;
			if (data.card.value != "rook"){
				var currentCard = new Card(parseInt(data.card.value), data.card.suit);
			}else{
				var currentCard = new Card(data.card.value, data.card.suit);
			}
			
			//this controls whether the play will count. 
			var hasTrickColor = false;

			console.log('current card:')
			console.dir(currentCard);
			

			if (socket.lobby.game.trickStarted){
					


				if (currentCard.suit == "rook"){
					currentCard.suit = socket.lobby.game.trump;
				}

				if (currentCard.suit != socket.lobby.game.trickColor){
					console.log("player played non-trick color");
					
					//check to make sure there is no trickColor in players hand
					// Check for rook if game.trickColor is trump
					console.dir(socket.lobby.game.players[socket.lobby.game.turn].hand);
					for (var i = 0; i < socket.lobby.game.players[socket.lobby.game.turn].hand.length; i++){
						if (socket.lobby.game.players[socket.lobby.game.turn].hand[i].suit == socket.lobby.game.trickColor || (socket.lobby.game.trickColor == socket.lobby.game.trump && socket.lobby.game.players[socket.lobby.game.turn].hand[i].suit == "rook")){
							console.log(socket.lobby.game.players[socket.lobby.game.turn].username + " has tried to play a non-trickColor card while having that color in their hand")
							hasTrickColor = true;
							io.to(socket.id).emit('must play color of trick');
							break;
						}
					}
					console.log("but they don't have the color, so it's ok");
				}
				


				if (!hasTrickColor){ //if they don't have the trick color OR if they placed a trick color card (since false is the initial value of hasTrickColor)

					// check to see if this card should replace current winner
					var trumpInTrick = false;
					var replace = true;


					for (var i = 0; i < socket.lobby.game.trickCards.length; i++){
						if (socket.lobby.game.trickCards[i].suit == socket.lobby.game.trump || socket.lobby.game.trickCards[i].suit == "rook"){
							trumpInTrick = true;
							console.log("trump in trick: " + trumpInTrick);
							break;
						}
					}
						

					//this big block of code checks to see if the card just played should win the trick
					if (currentCard.suit != socket.lobby.game.trickColor && currentCard.suit != socket.lobby.game.trump && currentCard.suit != "rook"){//checks for someone playing a different colored card that isn't trump
						replace = false;
					}else if ((currentCard.suit == socket.lobby.game.trump || currentCard.suit == "rook") && !trumpInTrick){
						replace = true;
					}else if ((currentCard.suit != socket.lobby.game.trump && currentCard.suit != "rook") && trumpInTrick){
						replace = false;
					}else if ((currentCard.suit != socket.lobby.game.trump) && !trumpInTrick){ //checked
						
						if (currentCard.value != 1){

							for (var i = 0; i < socket.lobby.game.trickCards.length; i++){
								if (currentCard.value < socket.lobby.game.trickCards[i].value || socket.lobby.game.trickCards[i].value == 1){
									replace = false;
									break;
								}
							}
						}
					}else if ((currentCard.suit == socket.lobby.game.trump || currentCard.suit == "rook") && trumpInTrick){//checked
						if (currentCard.value == "rook"){
							replace = false;
						}else{

							if (currentCard.value != 1){

								for (var i = 0; i < socket.lobby.game.trickCards.length; i++){
									if ((currentCard.value < socket.lobby.game.trickCards[i].value || socket.lobby.game.trickCards[i].value == 1) && (socket.lobby.game.trickCards[i].suit == socket.lobby.game.trump || socket.lobby.game.trickCards[i].suit == "rook")){
										replace = false;
									}
								}
							}
						}
					}


					if (replace){
						console.log("last player currently winning")
						socket.lobby.game.currentTrickWinner = socket.lobby.game.turn;
					}

					//switches rook suit back to "rook"
					if (currentCard.value == "rook"){ //test this
						currentCard.suit = "rook";
					}

				}
						

			} else {
				//starts trick
				socket.lobby.game.trickStarted = true;

				//this is when the first person plays trick
				
				if (currentCard.suit == "rook"){
					socket.lobby.game.trickColor = socket.lobby.game.trump;
				}else{
					socket.lobby.game.trickColor = currentCard.suit;
				}
				
				socket.lobby.game.currentTrickWinner = socket.lobby.game.turn;

			}


			//runs for all plays but those which are invalid
			if (!hasTrickColor){
				//check if it's a partner card
				for (var i = 0; i < socket.lobby.game.partnerArray.length; i++){
					if (currentCard.value == socket.lobby.game.partnerArray[i].value && currentCard.suit == socket.lobby.game.partnerArray[i].suit){
						socket.lobby.game.players[socket.lobby.game.turn].partner = true;
						console.log(socket.lobby.game.players[socket.lobby.game.turn].username + " is a partner");
					}
					
				}
				

				//update player hand
				socket.lobby.game.players[socket.lobby.game.turn].hand = [];
				for (var i = 0; i < data.hand.length; i++){
					var handCard = new Card(data.hand[i].value, data.hand[i].suit);
					//potentiall add some check to make sure the total number are cards in the hand is correct
					socket.lobby.game.players[socket.lobby.game.turn].hand.push(handCard);	
						
				}
			

				//send new hand back to player
				console.log("sending new hand back");
				io.to(socket.id).emit('new hand', socket.lobby.game.players[socket.lobby.game.turn]);

				//push card to trick pile
				socket.lobby.game.trickCards.push(currentCard);

				//iterate turn
				socket.lobby.game.nextTurn();

				//send events to everyone
				io.to(socket.lobby.name).emit('next player', {
					lastCard: socket.lobby.game.trickCards[socket.lobby.game.trickCards.length - 1],
					turn: socket.lobby.game.turn,
					order: socket.lobby.game.order(),
				});

				
			}


		}else{
			console.log("a player has tried to play out of turn");
			io.to(socket.id).emit('not your turn');
		}


		//Check for trick over
		if (socket.lobby.game.trickCards.length == socket.lobby.game.players.length){
			//start trick over
			socket.lobby.game.trickStarted = false;

			//determine next start player
			socket.lobby.game.turn = socket.lobby.game.currentTrickWinner;

			//reset trick color
			socket.lobby.game.trickColor = 0;
			
			//add trick cards to winner "won" array
			for (var i = 0; i < socket.lobby.game.trickCards.length; i++){
				socket.lobby.game.players[socket.lobby.game.currentTrickWinner].won.push(socket.lobby.game.trickCards[i]);
			}

			//reset trickCards
			socket.lobby.game.trickCards = [];

			//check for round over
			if (socket.lobby.game.players[socket.lobby.game.currentTrickWinner].hand.length == 0){
				console.log("round over");
				
				//pushing kitty to last winner's won array
				for (var i = 0; i < socket.lobby.game.kitty.length; i++){
					socket.lobby.game.players[socket.lobby.game.currentTrickWinner].won.push(socket.lobby.game.kitty[i]);
				}
				//and giving them 20 roundPoints
				socket.lobby.game.players[socket.lobby.game.currentTrickWinner].roundPoints += 20;
				

				



				
				
					//alert players and begin next round
					setTimeout(function(){


						socket.lobby.game.tallyScores();

						if (socket.lobby.game.over){
							io.to(socket.lobby.name).emit('update scores', {
								turn: socket.lobby.game.turn,
								order: socket.lobby.game.order(),
							});
						}

						if(!socket.lobby.game.over){
							io.to(socket.lobby.name).emit('next trick', {
								turn: socket.lobby.game.turn,
								order: socket.lobby.game.order(),
							});

						
							//send scores
							io.to(socket.lobby.name).emit('round end', {
								order: socket.lobby.game.order(),
							});
						}

						socket.lobby.game.resetRound();
						socket.lobby.game.beginRound();
					}, 3000);
				


				


	





			}else{

				//alert players and begin next trick
				setTimeout(function(){

					io.to(socket.lobby.name).emit('next trick', {
						turn: socket.lobby.game.turn,
						order: socket.lobby.game.order(),
					});
				}, 3000);
				
			}

		

		}

	});


	socket.on('chat message', (msg) => {
		//find player from socket id
		var user = findUser(socket.id);
		var rooms = socket.rooms;
		if (user){
			for (let room of rooms){
				if (room != socket.id){
					io.to(room).emit('chat message', socket.username + ": " + msg);
					console.log(socket.username + ": " + msg + ". In room: "+ room);
				}
			}
		}

		



	});

});

http.listen(3001, () => {
  console.log('listening on *:3001');
});