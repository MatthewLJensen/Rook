const express = require('express');
const app = express();
const path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var users = [];


let numUsers = 0;

// Routing
//trying a class
const suits = ["red", "yellow", "black", "green"];
const values = ["1","5","6","7","8","9","10","11","12","13","14"];
class Card{
	constructor(suit,value){
		this.suit = suit;
		this.value = value;
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
		for (var i = 0; i < 1000; i++)
		{
			var location1 = Math.floor((Math.random() * this.cards.length));
			var location2 = Math.floor((Math.random() * this.cards.length));
			var tmp = this.cards[location1];

			this.cards[location1] = this.cards[location2];
			this.cards[location2] = tmp;
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
	constructor(username, hand, won, dealer){
		this.username = username; //string
		this.hand = hand;// vector of cards
		this.won = won; //bolean
		this.dealer = dealer; //boolean
	}
}
class Game{
	constructor(kitty, bid, players){
		this.kitty = kitty;
		this.bid = bid;
		this.players = players;
	}
}
//end class test
app.use(express.static(path.join(__dirname, 'public')));

var kitty = [];

var players = [];

function createPlayers(users){
	for (var i = 0; i < users.length; i++){
		players.push(new Player(users[i], [], [], false));
	}
}

// function createDeck(){
// 	var deck = new Array();
	
// 	for(var i = 0; i < suits.length; i++)
// 	{
// 		for(var x = 0; x < values.length; x++)
// 		{
// 			var card = {Value: values[x], Suit: suits[i]};
// 			deck.push(card);
// 		}
// 	}
	
// 	deck.push({Value: 'rook', Suit: 'rook'});

// 	return deck;
	
// }

// function shuffle(deck)
// {
// 	// for 1000 turns
// 	// switch the values of two random cards
// 	for (var i = 0; i < 1000; i++)
// 	{
// 		var location1 = Math.floor((Math.random() * deck.length));
// 		var location2 = Math.floor((Math.random() * deck.length));
// 		var tmp = deck[location1];

// 		deck[location1] = deck[location2];
// 		deck[location2] = tmp;
// 	}
// }

function deal(deck, players){
	playerNum = 0;
	for (var i = 0; i < deck.length; i++){
		if (players.length == 3 && kitty.length < 6){
			kitty.push(deck[i])
		}else if ((players.length == 4 || players.length == 5) && kitty.length < 6){
			kitty.push(deck[i])
		}else if (players.length == 6 && kitty.length < 4){
			kitty.push(deck[i])
		}else{
			players[playerNum].hand.push(deck[i]);
			playerNum++;
		}
	
	}
	
	// console.log(kitty);
	
}

//deck = createDeck();
//shuffle(deck);

//deal(deck, ["matthew", "michael", "kristi"]);

//console.dir(deck);

io.on('connection', (socket) => {
	let addedUser = false;
	console.log('a user connected');
  
	
	
	socket.on('disconnect', () => {
		console.log('user disconnected');
		


		//remove user from users list
		for( var i = 0; i < users.length; i++){ 
                                   
			if ( users[i] === socket.username) { 
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
			socket.username = username;
		
			users.push(username);
			console.log("adding " + username + " to users list");
			numUsers++;
			
			addedUser = true;
			
			io.emit('login', {
				username: socket.username,
				numUsers: numUsers,
				users: users
			});
			
			socket.emit('name accepted', {
			});
		}
		
	});




	socket.on('chat message', (msg) => {
		io.emit('chat message', socket.username + ": " + msg);
		console.log(socket.username + ": " + msg);
	});

});

http.listen(3001, () => {
  console.log('listening on *:3001');
});