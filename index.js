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
		this.hand = [];
		this.bid = 0;
		this.won = []; //array of cards
		this.roundPoints = 0;
		this.points = 0;
		this.passed = false;
		this.partner = false;
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

		if (partnerPoints >= game.currentBid && game.currentBid != 400){
			console.log("partners succeeded by winning " + partnerPoints + " points.")
			partnersSucceeded = true;
		}else if(game.currentBid == 400 && partnerPoints == 200 && shootTheMoon){
			console.log("partner succeeded in shooting the moon and claiming every trick.")
			partnersSucceeded = true;
		}else{
			console.log("partners failed to win " + game.currentBid + " points. They only got " + partnerPoints + " points.")
			partnersSucceeded = false;
		}

		for (var i = 0; i < this.players.length; i++){
			if (this.players[i].partner && game.currentBid == 400 && partnersSucceeded){
				this.players[i].points += 400;
			}if (this.players[i].partner && partnersSucceeded){
				this.players[i].points += partnerPoints;
			}else if (this.players[i].partner && !partnersSucceeded){
				this.players[i].points -= game.currentBid;
			}else if (!this.players[i].partner){
				this.players[i].points += nonPartnerPoints;
			}
			console.log(this.players[i].username + "'s final points: " + this.players[i].points)

			if (this.players[i].points > 500){
				this.over = true;
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
			io.emit('game over', {
				winner: this.players[this.winner].username,
				points: this.players[this.winner].points,
				players: game.order(),
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


			
			setTimeout(function(){
				
				io.emit('to lobby', {
					numUsers: numUsers,
					users: users
				});

			}, 15000);
			

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
		}
	}
}


// function beatsPrevValue(incumbent, newVal){
// 	if (incumbent == 1){
// 		return false;
// 	} else if (newVal == 1){
// 		return true;
// 	}else if(incumbent == "rook"){
// 		return true;
// 	}else if(newVal == "rook"){
// 		return false;
// 	}else if (newVal > incumbent){
// 		return true;
// 	}else{
// 		return false;
// 	}
// }

// function trickContainsTrump () {


// }

function sendPlayedCard(){





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

		var nameInUse = false;

		for (var i = 0; i < users.length; i++){
			if (users[i].username == username){
				console.log("name in use");
				nameInUse = true;
				//potentially alert user about this
			}
		}

		if (nameInUse){
			
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
						game.highestBidder = game.turn;//game.highestBidder = game.players[game.turn];
						game.currentBid = bid;
					}

					game.nextTurn();
					
					if (!biddingEnded){
						//send bid to other players as long as the bid process is still in progress
						
						while(game.players[game.turn].passed){//This skips passed people
					
							game.nextTurn()
					
						}
						//game.highestBidder.username,
						io.emit('bid placed', {
							currentBid: game.currentBid,
							highestBidder: game.players[game.highestBidder].username,
							turn: game.turn,
							order: game.order(),
							passed: game.passed
						});
					}else{
						//game.highestBidder.username
						io.emit('bidding ended', {
							currentBid: game.currentBid,
							highestBidder: game.players[game.highestBidder].username,
						});
						
						//set winner as partner
						game.players[game.highestBidder].partner = true;

						//add kitty to winner hand
						//game.highestBidder.hand.push(game.kitty[i]);
						for (var i = 0; i < game.kitty.length; i++){
							game.players[game.highestBidder].hand.push(game.kitty[i]);
						}
						//game.highestBidder.sid
						
						//determine how many partners should be called
						var numPartners = 0;
						if(game.currentBid == 400){
							numPartners = 0;
						}else{
							numPartners = (Math.floor(game.players.length/2) - 1);
						}
						//send kitty
						io.to(game.players[game.highestBidder].sid).emit('kitty contents', {
							kitty: game.kitty,
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
		if(newKitty.length == game.kitty.length){
			game.kitty = newKitty;

			//remove kitty from winner hand
			for (var i = 0; i < game.kitty.length; i++){
				var kittyCard = new Card(game.kitty[i].value, game.kitty[i].suit);
					for (var x = 0; x < game.players[game.highestBidder].hand.length; x++){
						if (kittyCard.value == game.players[game.highestBidder].hand[x].value && kittyCard.suit == game.players[game.highestBidder].hand[x].suit){
							game.players[game.highestBidder].hand.splice(x, 1);		
						}
					}
			}

			//send new hand to winner
			io.to(game.players[game.highestBidder].sid).emit('new hand', game.players[game.highestBidder]);

			//determine if there are points in the kitty
			for(var i = 0; i < game.kitty.length; i++){
				if(game.kitty[i].value == 1 || game.kitty[i].value == 14 || game.kitty[i].value == 5 ||game.kitty[i].value == 10 || game.kitty[i].value == 'rook' ){
					pointsInKitty = true;
					break;
				}
			}
			if(pointsInKitty){
				io.emit('points in kitty');
			}else{
				io.emit('no points in kitty');
			}

		}
		else{io.to(game.players[game.highestBidder].sid).emit('too few or too many cards in kitty');}
	})



	socket.on('partner', (partnerArray) =>{
		//check to make sure the sender is the highest bidder

		for (var i = 0; i < partnerArray.length; i++){
			var partner = new Card(partnerArray[i].value, partnerArray[i].suit);
			game.partnerArray.push(partner);
		}
		console.log("Partners:")
		console.dir(game.partnerArray)
	});

	socket.on('trump', (trumpColor) =>{
		//check to make sure the sender is the highest bidder
		console.dir(trumpColor);
		game.trump = trumpColor;
		console.log("Trump Color: " + game.trump);

		//this is currently starting playing cards section of the round
		console.log("final bid: " + game.currentBid);

		game.turn = game.highestBidder;

		console.log("turn: " + game.turn);

		io.emit('round beginning', {
			trumpColor: game.trump,
			partnerArray: game.partnerArray,
			turn: game.turn,
			order: game.order(),
			highestBidder: game.players[game.highestBidder].username,
			currentBid: game.currentBid
		});

	});


	socket.on('play card', (data) =>{

		console.dir(data);
		
		//check to make sure it's the senders turn
		console.log("curent player username: " + game.players[game.turn].username);
		console.log("curent player socket id: " + game.players[game.turn].sid);
		console.log("socket id: " + socket.id);

		if (socket.id == game.players[game.turn].sid){
			
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
			

			if (game.trickStarted){
					


				if (currentCard.suit == "rook"){
					currentCard.suit = game.trump;
				}

				if (currentCard.suit != game.trickColor){
					console.log("player played non-trick color");
					
					//check to make sure there is no trickColor in players hand
					// Check for rook if game.trickColor is trump
					console.dir(game.players[game.turn].hand);
					for (var i = 0; i < game.players[game.turn].hand.length; i++){
						if (game.players[game.turn].hand[i].suit == game.trickColor || (game.trickColor == game.trump && game.players[game.turn].hand[i].suit == "rook")){
							console.log(game.players[game.turn].username + " has tried to play a non-trickColor card while having that color in their hand")
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


					for (var i = 0; i < game.trickCards.length; i++){
						if (game.trickCards[i].suit == game.trump || game.trickCards[i].suit == "rook"){
							trumpInTrick = true;
							console.log("trump in trick: " + trumpInTrick);
							break;
						}
					}
						

					//this big block of code checks to see if the card just played should win the trick
					if (currentCard.suit != game.trickColor && currentCard.suit != game.trump && currentCard.suit != "rook"){//checks for someone playing a different colored card that isn't trump
						replace = false;
					}else if ((currentCard.suit == game.trump || currentCard.suit == "rook") && !trumpInTrick){
						replace = true;
					}else if ((currentCard.suit != game.trump && currentCard.suit != "rook") && trumpInTrick){
						replace = false;
					}else if ((currentCard.suit != game.trump) && !trumpInTrick){ //checked
						
						if (currentCard.value != 1){

							for (var i = 0; i < game.trickCards.length; i++){
								if (currentCard.value < game.trickCards[i].value || game.trickCards[i].value == 1){
									replace = false;
									break;
								}
							}
						}
					}else if ((currentCard.suit == game.trump || currentCard.suit == "rook") && trumpInTrick){//checked
						if (currentCard.value == "rook"){
							replace = false;
						}else{

							if (currentCard.value != 1){

								for (var i = 0; i < game.trickCards.length; i++){
									if ((currentCard.value < game.trickCards[i].value || game.trickCards[i].value == 1) && (game.trickCards[i].suit == game.trump || game.trickCards[i].suit == "rook")){
										replace = false;
									}
								}
							}
						}
					}


					if (replace){
						console.log("last player currently winning")
						game.currentTrickWinner = game.turn;
					}

					//switches rook suit back to "rook"
					if (currentCard.value == "rook"){ //test this
						currentCard.suit = "rook";
					}

				}
						

			} else {
				//starts trick
				game.trickStarted = true;

				//this is when the first person plays trick
				
				if (currentCard.suit == "rook"){
					game.trickColor = game.trump;
				}else{
					game.trickColor = currentCard.suit;
				}
				
				game.currentTrickWinner = game.turn;

			}


			//runs for all plays but those which are invalid
			if (!hasTrickColor){
				//check if it's a partner card
				for (var i = 0; i < game.partnerArray.length; i++){
					if (currentCard.value == game.partnerArray[i].value && currentCard.suit == game.partnerArray[i].suit){
						game.players[game.turn].partner = true;
						console.log(game.players[game.turn].username + " is a partner");
					}
					
				}
				

				//update player hand
				game.players[game.turn].hand = [];
				for (var i = 0; i < data.hand.length; i++){
					var handCard = new Card(data.hand[i].value, data.hand[i].suit);
					//potentiall add some check to make sure the total number are cards in the hand is correct
					game.players[game.turn].hand.push(handCard);	
						
				}
			

				//send new hand back to player
				console.log("sending new hand back");
				io.to(socket.id).emit('new hand', game.players[game.turn]);

				//push card to trick pile
				game.trickCards.push(currentCard);

				//iterate turn
				game.nextTurn();

				//send events to everyone
				io.emit('next player', {
					lastCard: game.trickCards[game.trickCards.length - 1],
					turn: game.turn,
					order: game.order(),
				});

				
			}


		}else{
			console.log("a player has tried to play out of turn");
			io.to(socket.id).emit('not your turn');
		}


		//Check for trick over
		if (game.trickCards.length == game.players.length){
			//start trick over
			game.trickStarted = false;

			//determine next start player
			game.turn = game.currentTrickWinner;

			//reset trick color
			game.trickColor = 0;
			
			//add trick cards to winner "won" array
			for (var i = 0; i < game.trickCards.length; i++){
				game.players[game.currentTrickWinner].won.push(game.trickCards[i]);
			}

			//reset trickCards
			game.trickCards = [];

			//check for round over
			if (game.players[game.currentTrickWinner].hand.length == 0){
				console.log("round over");
				
				//pushing kitty to last winner's won array
				for (var i = 0; i < game.kitty.length; i++){
					game.players[game.currentTrickWinner].won.push(game.kitty[i]);
				}
				//and giving them 20 roundPoints
				game.players[game.currentTrickWinner].roundPoints += 20;
				

				



				
				
					//alert players and begin next round
					setTimeout(function(){


						game.tallyScores();

						if (game.over){
							io.emit('update scores', {
								turn: game.turn,
								order: game.order(),
							});
						}

						if(!game.over){
							io.emit('next trick', {
								turn: game.turn,
								order: game.order(),
							});

						
							//send scores
							io.emit('round end', {
								order: game.order(),
							});
						}

						game.resetRound();
						game.beginRound();
					}, 3000);
				


				


	





			}else{

				//alert players and begin next trick
				setTimeout(function(){

					io.emit('next trick', {
						turn: game.turn,
						order: game.order(),
					});
				}, 3000);
				
			}

		

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