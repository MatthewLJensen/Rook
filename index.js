const express = require('express');
const app = express();
const path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var users = [];
const suits = ["red", "yellow", "black", "green"];
const values = ["1","5","6","7","8","9","10","11","12","13","14"];
var game;
let numUsers = 0;

// Routing
//trying a class
class Card{
	constructor(value, suit){
		this.value = value;
		this.suit = suit;
	}
}
//console.log(new Card("red","1").value);
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
	
	deal(players,kitty){
		var playerNum = 0;
		for (var i = 0; i < this.length; i++){

			if (players.length == 3 && kitty.length < 6){
				kitty.push(this[i])
			}
			else if ((players.length == 4 || players.length == 5) && kitty.length < 6){
				kitty.push(this[i])
			}
			else if (players.length == 6 && kitty.length < 4){
				kitty.push(this[i])
			}
			else{

				if (playerNum == (players.length - 1)){
					playerNum = 0;
				}

				players[playerNum].hand.push(this[i]);
				playerNum++;
			}
		}
	

	}
}
// console.log("unshuffled");
// var deck = new Deck(suits,values);
// console.dir(deck);
// console.log("shuffled:");
// deck.shuffle();
// console.dir(deck);



class Player{
	constructor(sid,username){
		this.sid = sid;
		this.username = username;
		this.hand = []; //string
		this.bid = 0;
		//this.hand = hand;// vector of cards
		//this.won = won; //array of cards
		this.passed = false;
	}
	won(wonparam){
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
	constructor(username, orderNum){
		this.username = username;
		this.orderNum = orderNum;
	}
}

class Game{
	constructor(players){
		this.players = players;
		this.deck = new Deck(suits,values);
		this.kitty = [];
		this.turn = 0;
		this.highestBidder = 0;
		this.currentBid = 0;
		this.bidding = true;
		this.passed = [];
		
	}
	
	startGame(){
		//set turn order
		for (var i = 0; i < this.players.length; i++){
			this.players[i].setturnorder(i);
		}

		//shuffle deck
		this.deck.shuffle();

		//deal cards
		this.deal();

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
			else if ((this.players.length == 4 || this.players.length == 5) && this.kitty.length < 6){
				this.kitty.push(this.deck.cards[i])
			}
			else if (this.players.length == 6 && this.kitty.length < 4){
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
			playerOrder.push(new hiddenPlayer(this.players[i].username, this.players[i].turnnum));
		}
		return playerOrder;
	}
	
	nextTurn(){
		if (this.bidding){
						
			if (this.turn > (this.players.length - 2)){
				this.turn = 0;
			}else{
				this.turn++;
			}

			
		}else{
			
			if (this.turn > (this.players.length - 2)){
				this.turn = 0;
			}else{
				this.turn++;
			}
		}
	}
	
	newRound(){
		//reset hand
		//deal/new kitty
		//reset passed bid
		
		
	}
	
}



app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
	let addedUser = false;
	console.log('a user connected');
  
	
	
	socket.on('disconnect', () => {
		console.log('user disconnected');
		


		//remove user from users list
		for( var i = 0; i < users.length; i++){ 
                                   
			if ( users[i].sid === socket.id) { 
				users.splice(i, 1); 
				i--; 
			}
		}
		
		numUsers--;
		
		io.emit('logout', {
			username: socket.username,
			numUsers: numUsers,
			users: users
		});
		
	});



  // when the client emits 'add user', this listens and executes
	socket.on('add user', (username) => {
		if (addedUser) return;

		if (users.includes(username)){
			
			socket.emit('name in use', {
			});
			
		}else{
		
			// we store the username in the socket session for this client
			socket.username = username; //I uncommented this because it's how our chat is getting the username without needing to compare it to the array of users.
		
			users.push(new Player(socket.id, username));
			console.log("adding " + username + " to users list");
			numUsers++;
			
			addedUser = true;
			
			io.emit('login', {
				username: username,
				numUsers: numUsers,
				users: users
			});
			
			socket.emit('name accepted', {
			});
		}
		
	});


	socket.on('start game', () => {
		console.log('Game is starting');
		
		//setup game class
		game = new Game(users);
		game.startGame();

		console.dir(game);
		

		//send data back to clients
		for(var i = 0; i < game.players.length; i++){
			console.log(game.players[i].sid);
			console.dir(game.order);
			
			io.to(game.players[i].sid).emit('start bidding', {
				player: game.players[i], 
				order: game.order()
			});
		}
		
	});
	
	socket.on('bid', (bid) => {
		//setup passed
		
		if (bid != "pass"){
			bid = parseInt(bid);
		}

		if(socket.id == game.players[game.turn].sid && game.players[game.turn].bid != "pass"){
			var biddingEnded = false;


				if((bid >= 80 && bid >= (game.currentBid + 5) && bid <= 200) || bid === "pass" || bid == 400){


					if(bid === 'pass'){
						console.log("player has passed");
						game.players[game.turn].passed = true;
						game.players[game.turn].bid = "pass";
						game.passed.push(game.players[game.turn].username);
						
						// This checks to see if everyone has passed. If so, it ends the bidding.
						if (game.passed.length == (game.players.length - 1)){ //potential problems: What if every passes on the first round? Does the last player get the bid for 80?
							console.log("bidding has ended");
							biddingEnded = true;
							
						}
						
					}else{
						if(bid == 400){
							biddingEnded = true;
						}

						game.players[game.turn].bid = bid;
						game.highestBidder = game.players[game.turn];
						game.currentBid = bid;
					}

					game.nextTurn();
					
					if (!biddingEnded){
						//send bid to other players as long as the bid process is still in progress
						
						while(game.players[game.turn].passed){//This skips passed people
					
							game.nextTurn()
					
						}
						
						io.emit('bid placed', {
							currentBid: game.currentBid,
							highestBidder: game.highestBidder.username,
							turn: game.turn,
							order: game.order(),
							passed: game.passed
						});
					}else{

						io.emit('bidding ended', {
							currentBid: game.currentBid,
							highestBidder: game.highestBidder.username,
						});
						io.to(game.highestBidder.sid).emit('kitty contents',game.kitty);

						

					}
					
				}else{
					console.log("bid too low, telling user to try again");
					io.to(socket.id).emit('bid too low');
					
				}
				


			
	
			
			
			
		}
		else{
			console.log("a player has tried to play out of turn");
			io.to(socket.id).emit('not your turn');
		}
	});
	socket.on('new kitty',(newkitty) =>{
		if(newkitty.length == game.kitty.length){
			game.kitty = newkitty;
			for(var i = 0; i < game.kitty.length; i++){
				if(game.kitty[i].value == 1 || game.kitty[i].value == 14 || game.kitty[i].value == 5 ||game.kitty[i].value == 10 || game.kitty.value[i] == 'rook' ){
					io.emit('points in kitty');
					break;
				}
			}
			io.emit('no points in kitty');
		}
		else{io.to(game.highestBidder.sid).emit('too few or too many cards in kitty');}
	})


	socket.on('chat message', (msg) => {
		io.emit('chat message', socket.username + ": " + msg);
		console.log(socket.username + ": " + msg);
	});

});

http.listen(3001, () => {
  console.log('listening on *:3001');
});


// function deal(deck, players){
// 	playerNum = 0;
// 	for (var i = 0; i < deck.length; i++){

// 		if (players.length == 3 && kitty.length < 6){
// 			kitty.push(deck[i])
// 		}else if ((players.length == 4 || players.length == 5) && kitty.length < 6){
// 			kitty.push(deck[i])
// 		}else if (players.length == 6 && kitty.length < 4){
// 			kitty.push(deck[i])
// 		}else{

// 			if (playerNum == (players.length - 1)){
// 				playerNum = 0;
// 			}

// 			players[playerNum].hand.push(deck[i]);
// 			playerNum++;
// 		}
	
// 	}
	
	
	
// }

//deck = createDeck();
//shuffle(deck);

//deal(deck, ["matthew", "michael", "kristi"]);

//console.dir(deck);