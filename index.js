const express = require('express');
const app = express();
const path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var users = [];
var passed = [];
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
		//this.hand = hand;// vector of cards
		//this.won = won; //array of cards
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
		this.highestbidder = 0;
		
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
		playerOrder = []
		for (var i = 0; i < this.players.length; i++){
			playerOrder.push(new hiddenPlayer(this.players[i].username, this.players[i].turnnum));
		}
		return playerOrder;
	}
	
}

function setuppassed(gameinstance){
	passed = new Array(gameinstance.players.length);
	for(var i = 0; i < gameinstance.players.length; i++){
		passed[i] = 0;
	}
}
// function checkplayerpassed(player){
// 	id = player.id;
// 	for(i = 0; i <  )
// }
function checkallpassed(){
	for(var i = 0; i < passed.length; i++){
		if(passed[i] == 0){
			return 0;
		}
	}
	return 1;
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
			io.to(game.players[i].sid).emit('start bidding', {
				player: game.players[i], 
				order: game.order
			});
		}
		setuppassed(game);
		
	});
	socket.on('bid', (bid) => {
		//setup passed
		
		if(socket.id == game.players[game.turn]){
			//checkplayerpassed(player)
			if(game.highestbidder == 0){
				if(bid >= 80){
					game.players[game.turn].bid = bid;
					game.highestbidder = game.players[game.turn];
					game.turn++;
				}
				else if(bid === 'pass'){
					io.to(socket.id).emit('bid too low');
				}
				else{
					io.to(socket.id).emit('bid too low');
				}
			}
			else{
				if(bid >= game.highestbidder.bid + 5){
					game.player[game.turn].bid = bid;
					game.highestbidder = game.players[game.turn];
					game.turn++;
					while(passed[game.turn] == 1){
						game.turn++;
					}
				}
				else if(bid === 'pass'){
					passed[game.turn] = 1;
					game.turn++;
					if(checkallpassed() == 1){
						// check if highest bidder
						for(var i = 0; i < game.players; i++){
							if(game.highestbidder.id === game.players[i].id){
								io.to(game.highestbidder.id).emit('settings for highest bidder');
							}
							else{
								io.to(game.player[i].id).emit('wait on highest bidder');
							}
						}
						passed = [];
					}
				}
				else{
					io.to(socket.id).emit('bid too low');
				}
			}
			
			
		}
		else{
			io.to(socket.id).emit('not your turn');
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