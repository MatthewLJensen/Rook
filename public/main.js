/*
Edited by Matthew on December 2, 2020
*/
$(function () {
	var socket = io();
	var username;
	var player;
	var numCardsSelected = 0;
	var selectingKitty = false;
	var kittyLength = 0;
	var numPlayers = 0;
	var playingCard = false;

	$('#join_lobby').submit(function(e){
		e.preventDefault(); // prevents page reloading
			//tell server the username
			username = $('#name_input').val().trim();
			socket.emit('add user', username);
		
	});

	$('#start_game').click(function(){
			//Tell the server to setup/start the game
			socket.emit('start game');
		
	});


	$('#bid_action').click(function(){
			console.log("placing bid");
		
			//Tell the server to setup/start the game
			var bid = document.getElementById('bid_input').value;
			var bid_label = document.getElementById('#bid_label');
			
			//input checking
			if (bid != "pass" && bid < 80){
				bid_label.innerHTML = "Bid not valid";
			}else{
			
				socket.emit('bid', bid);
				
			}
	});



	$(document).on('click', '.card_img, .card_img_selected', function() {
		
		var selectedCardID = $(this).attr('id');
		var selectedCard = document.getElementById(selectedCardID);

		if (!playingCard){

			if (selectedCard.classList.contains('card_img')){ //clicking an unselected card
				console.log("selecting card");
				selectedCard.classList.add('card_img_selected');
				selectedCard.classList.remove('card_img');
				numCardsSelected++;
			}else{//clicking an selected card
				console.log("deselecting card");
				selectedCard.classList.add('card_img');
				selectedCard.classList.remove('card_img_selected');
				numCardsSelected--;
			}
	
			if (selectingKitty){
				var announcement = document.getElementById("instructions");
				announcement.innerHTML = "Choose " + kittyLength + " cards to send back. (" + numCardsSelected + " out of " + kittyLength + ")";
			}
	
			if (selectingKitty && numCardsSelected == kittyLength){
				$('#kitty_submit').prop("disabled",false);
			}else{
				$('#kitty_submit').prop("disabled",true);
			}

		}else{
			//user clicking a card will play it
			var cardID = selectedCardID.slice(3); //cuts off the img part of id
			var cardArray = cardID.split(' ');
			var value = cardArray[0];
			var suit = cardArray[1];
			
			var playedCard = {
				value: value,
				suit: suit
			};

			console.log("played card:");
			console.dir(playedCard);

			//get hand
			var hand = [];
			$('#cards_ul').children('li').each(function () {
				if ($(this).children(':first').attr('id') != selectedCardID){
					var cardID = $(this).children(':first').attr('id').slice(3); //cuts off the img part of id
					console.log(cardID);
					var cardArray = cardID.split(' ');
					var value = cardArray[0];
					var suit = cardArray[1];
					hand.push({
						value: value,
						suit: suit
					})	
				}				
			});

			
			console.log("new hand:");
			console.dir(hand);

			socket.emit('play card', {
				card: playedCard,
				hand: hand
			});
		}
		

		
	});

	
	$(document).on('change', '.partner_select', function() {
		console.log("select changed");
		if (this.value == "rook"){
			console.log("new value is rook");
			$(this).parent().children().each(function(){
				console.dir($(this));
				$(this).val("rook");
				$(this).val("rook");

			});
			
		}
	});
	

	$('#submit_kitty').submit(function(e){
		e.preventDefault(); // prevents page reloading
			console.log("submitting kitty");

			//username = $('#name_input').val().trim();
			//socket.emit('add user', username);
			
			//gets new kitty
			var kitty = [];
			$('#cards_ul').children('li').each(function () {
				if ($(this).children(':first').attr('class') == 'card_img_selected'){
					var cardID = $(this).children(':first').attr('id').slice(3); //cuts off the img part of id
					console.log(cardID);
					var cardArray = cardID.split(' ');
					var value = cardArray[0];
					var suit = cardArray[1];
					kitty.push({
						value: value,
						suit: suit
					})	
				}				
			});

			//gets partner
			var partnerInputsDiv = document.getElementById("partner_inputs");
			partnerArray = [];

			var i = 0;

			while(document.getElementById(i + "partner_input_suit")){
				
				var suit = document.getElementById(i + "partner_input_suit").value;
				var value = document.getElementById(i + "partner_input_value").value;

					partnerArray.push({
					value: value,
					suit: suit
				});
				i++;

			}


			//get trump
			var trumpcolor = document.getElementById("trump_input").value;


			console.dir(kitty);
			console.dir(partnerArray);
			console.dir(trumpcolor);

			socket.emit('new kitty', kitty);

			socket.emit('partner', partnerArray);

			socket.emit('trump', trumpcolor);
		
	});

	socket.on('name accepted', function(){
		console.dir("Name accepted");

		
		if (username){
			$('.username').hide();
			$('.lobby').show();
			$('.messaging').show();
		}
		
	});
	
	
	socket.on('name in use', function(data){
		console.dir("That name is already in use, please choose another.");
		
	});
	
	
	$('#send_message').submit(function(e){
		e.preventDefault(); // prevents page reloading
		socket.emit('chat message', $('#m').val());
		$('#m').val('');
		return false;
	});
	

	socket.on('chat message', function(msg){
		
		$('#messages').append($('<li>').text(msg));
		
		var messages_ul = document.getElementById('messages');
		$("#messages").stop().animate({ scrollTop: $("#messages")[0].scrollHeight}, 1000);
	});
	
	socket.on('login', function(data){
		console.dir("New player. Total: " + data.numUsers);

		update_users(data.users);

		console.dir(data);
	});
	

	socket.on('start bidding', function(data){
		//Hide Lobby
		$('.lobby').hide();
		$('.playing_area').show();
		
		//set global variable for total number of players
		numPlayers = data.order.length;
		
		console.dir(data);
		player = data.player;
		var order = data.order;
		console.log("player info coming in");
		console.dir(player);
		console.dir(order);

		//$('#cards').append($('<li>').text(msg));
		display_cards(player.hand);
		display_opponents(order, player.turnnum);
		
		//show announcements
		var announcement = document.getElementById("announcements");
		announcement.innerHTML = "Start Bidding";
		
		//set bidder
		update_bidder(order, player.username, 0);
		
		
	});
	
	
	socket.on('bid placed', function(data){

		console.dir(data);
		
		//show announcements
		var announcement = document.getElementById("announcements");
		announcement.innerHTML = "Current bid = " + data.currentBid + " by " + data.highestBidder;
		
		//set bidder
		update_bidder(data.order, username, data.turn);
		
		
	});
	
	socket.on('bidding ended', function(data){
		console.log("bidding has ended");
		console.dir(data);
		
		//show announcements
		var announcement = document.getElementById("announcements");
		announcement.innerHTML = "Final bid = " + data.currentBid + " by " + data.highestBidder;
		
		$('#bidding_div').hide();
		
		//clear all bolds and skips			
		$('#opponents').children('div').each(function () {
			$(this).children().first().css("font-weight","");
		});
		
		
	});

	socket.on('kitty contents', function(kitty){
		console.log("receiving kitty");
		
		kittyLength = kitty.length;
		selectingKitty = true;

		for (var i=0; i < kitty.length; i++){
			player.hand.push(kitty[i]);
		}

		console.dir(kitty)
		console.dir(player.hand)

		display_cards(player.hand);

		//Tell user to choose cards to send back
		var announcement = document.getElementById("instructions");
		announcement.innerHTML = "Choose " + kitty.length + " cards to send back";
		
		$('#kitty_selection').show();

		//This next section handles choosing 0-2 partners
		var numPartners = (Math.floor(numPlayers/2) - 1);
		var partner_inputs_div = document.getElementById("partner_inputs");
		for (var i = 0; i < numPartners; i++){

			var partner_select = document.getElementById("partner_select").cloneNode(true);
			partner_select.classList.remove("template");
			
			partner_select.id = i + "partner_inputs";

			console.dir(partner_select);

			partner_select.children[0].id = i + "partner_input_suit";
			partner_select.children[1].id = i + "partner_input_value";
			
			// Create label
			var label = document.createElement('label');
			label.setAttribute("for", i + "partner_inputs");
			label.innerHTML = "Call partner " + (i + 1) + ": ";
			partner_inputs_div.appendChild(label);

			partner_inputs_div.appendChild(partner_select);
		}
		
	});
	
	socket.on('too few or too many cards in kitty', function(){
		console.log("too few or too many cards in kitty");
	});

	socket.on('points in kitty', function(){
		console.log("There are points in the kitty");
		document.getElementById("kitty_points_p").innerHTML = "(There are points)";
	});

	socket.on('no points in kitty', function(){
		console.log("There are no points in the kitty");
		document.getElementById("kitty_points_p").innerHTML = "(There are no points)";
	});
	
	
	socket.on('new hand', function(newPlayer){
		player = newPlayer; //sets local player var to the latest specs

		console.log("receiving new hand");
		
		display_cards(player.hand);

		$('#kitty_selection').hide();
		
	});

	socket.on('round beginning', function(data){
		console.log("round is beginning");
		console.dir(data);
		
		var i = 0;

		partners = ""
		while(data.partnerArray[i]){
			partners += data.partnerArray[i].suit + " " + data.partnerArray[i].value + "<br />";
			i++;
		}

		
		//update announcements
		var announcement = document.getElementById("announcements");
		announcement.innerHTML = "Final Bid: " + data.currentBid + " by " + data.highestBidder + "<br />Trump Color: " + data.trumpColor + "<br /><u>Partner(s)</u>:<br />" + partners;

		//bold current player
		update_player(data.order, username, data.turn);
		
	});

	socket.on('next player', function(data){
		console.log("next persons turn");
		console.dir(data);


		//bold current player
		update_player(data.order, username, data.turn);

		//add last played card
		console.log("last played: " + findCard(data.lastCard.value, data.lastCard.suit));
		var img = document.createElement('img');
		img.setAttribute('src', `cards/${findCard(data.lastCard.value, data.lastCard.suit)}`);
		img.setAttribute('id', "img" + data.lastCard.value + " " + data.lastCard.suit);
		img.setAttribute('class', 'card_img_card_pile');

		document.getElementById('card_pile').appendChild(img);
		
	});

	socket.on('next trick', function(data){
		console.log("new trick");
		console.dir(data);

		//bold current player
		update_player(data.order, username, data.turn);

		//remove previously played cards
		document.getElementById('card_pile').innerHTML = "";

		//tell users who won previous trick
		document.getElementById('last_trick_winner').innerHTML = "Last Trick Winner: " + data.order[data.turn].username;
		
	});
	
		
	socket.on('must play color of trick', function(){
		console.log("You have trick color, but you tried to play another color");
	});

	
	const update_player = (order, myUsername, turn) => {
		
		var currentPlayer = order[turn].username;
		
		console.log("Current player: " + currentPlayer);
		
		if (currentPlayer == myUsername){
			//indicate it is my turn
//			$('#bid_action').prop("disabled",false);
			console.log("It is my turn to play a card");
			playingCard = true;

			//clear bolds from opponents
			$('#opponents').children('div').each(function () {
				$(this).children().first().css("font-weight","");
			});
			
		}else{
			//indicate it is not my turn
//			$('#bid_action').prop("disabled",true);
			console.log("It is not my turn to play a card");
			playingCard = false;
			$('#opponents').children('div').each(function () {
				if ($(this).children().first().attr('id') == currentPlayer){
					$(this).children().first().css("font-weight","Bold");
					
				}else{
					$(this).children().first().css("font-weight","");
					
				}
				
			});
			
		}

	}




	const update_bidder = (order, myUsername, turn) => {
		
		var opponents = document.getElementById('opponents')
		currentBidder = order[turn].username;
		
		console.log(currentBidder);
		console.log(myUsername);
		
		if (currentBidder == myUsername){
			//indicate it is my turn
			$('#bid_action').prop("disabled",false);
			console.log("It is my turn to bid");
			//clear bolds from opponents
			$('#opponents').children('div').each(function () {
				$(this).children().first().css("font-weight","");
			});
			
		}else{
			//indicate it is not my turn
			$('#bid_action').prop("disabled",true);
			console.log("It is not my turn to bid");
			
			$('#opponents').children('div').each(function () {
				if ($(this).children().first().attr('id') == currentBidder){
					$(this).children().first().css("font-weight","Bold");
					console.log("setting bidder");
				}else{
					$(this).children().first().css("font-weight","");
					console.log("clearing bold");
				}
				
			});
			
		}

	}
	
	

	const display_opponents = (order, myPosition) => {
		var opponents = document.getElementById('opponents')



		
	    for (var i = myPosition; i < order.length + myPosition; i++) { //This is a little weird, but you need to start in the middle of the array so that you can iterate through and place the competitors in the right order. This is also why you need to the modulus on the index a few lines down.
			
			if (i != myPosition){//prevents you from getting added to the list of other players

				// Create div for each opponent
				var list = document.createElement('div');
				list.setAttribute("id", "opponents_div");

				// Create the list item:
				var item = document.createElement('li');
				item.setAttribute("id", order[i % order.length].username);

				// Set its contents:
				item.appendChild(document.createTextNode(order[i % order.length].username));

				// Add it to the div:
				list.appendChild(item);
				
				// Add new div to opponents div
				opponents.appendChild(list);

			}
		}

		


	}

	const display_cards = (cards) => {
		var cards_div = document.getElementById('cards_div');
		cards_div.innerHTML = "";
		
		
		var list = document.createElement('ul');
		list.setAttribute("id", "cards_ul");
		

	    for (var i = 0; i < cards.length; i++) {
			
			// Create the list item:
			var item = document.createElement('li');
			item.setAttribute("class", "cards_li");
			item.setAttribute("id", cards[i].value + " " + cards[i].suit);
			//item.appendChild(document.createTextNode(cards[i].value + " " + cards[i].suit));
			item.draggable = true;

			var img = document.createElement('img');
			img.setAttribute('src', `cards/${findCard(cards[i].value, cards[i].suit)}`);
			img.setAttribute('id', "img" + cards[i].value + " " + cards[i].suit);
			img.setAttribute('class', 'card_img');
			//img.draggable = true;

			// Set link contents:
			//link.appendChild(document.createTextNode(cards[i].value + " " + cards[i].suit));
			//item.appendChild(document.createTextNode(cards[i].value + " " + cards[i].suit));
			//item.appendChild(img);

			//set li contents
			item.appendChild(img);

			// Add it to the list:
			list.appendChild(item);			
		}

		cards_div.appendChild(list);


		var sortable = Sortable.create(cards_ul);

	}

	
	// Updates users list
	const update_users = (users) => {
		
		var users_div = document.getElementById('users_div');
		var start_game_label = document.getElementById('start_game_label');
		users_div.innerHTML = "";
		
		var list = document.createElement('ul');
		
	    for (var i = 0; i < users.length; i++) {
			
			// Create the list item:
			var item = document.createElement('li');

			// Set its contents:
			item.appendChild(document.createTextNode(users[i].username));

			// Add it to the list:
			list.appendChild(item);			
		}
		
		users_div.appendChild(list);
		
		if (users.length > 2 && users.length < 7){
			document.getElementById('start_game').disabled = false;
			start_game_label.innerHTML = "";
		}else if (users.length < 3){
			document.getElementById('start_game').disabled = true;
			start_game_label.innerHTML = "You have too few players. A minimum of 3 is required. You currently have " + users.length + ".";
		}else{
			document.getElementById('start_game').disabled = true;
			start_game_label.innerHTML = "You have too many players. The maximum number of players is 6. You currently have " + users.length + ".";
		}

	}



	// Maps image to card
	const findCard = (value, suit) => {
		
		if (suit == "rook"){
			return "crow.svg";
		}

		correctVal = value.toString();
		correctSuit = suit.charAt(0).toUpperCase() + suit.slice(1);


		if (correctVal.length < 2){
			correctVal = "0" + correctVal;
		}


		var cardLink = correctSuit + " " + correctVal + ".svg";
		return cardLink;
	}
	

	
	socket.on('logout', function(data){
		console.dir("Player left. Total: " + data.numUsers);
		update_users(data.users);
	});
});

