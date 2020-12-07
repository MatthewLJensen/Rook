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



	$(document).on('click', '.cards_li, .cards_li_selected', function() {
		
		var selectedCardID = $(this).attr('id');
		var selectedCard = document.getElementById(selectedCardID);

		
		if (selectedCard.classList.contains('cards_li')){ //clicking an unselected card
			console.log("selecting card");
			selectedCard.classList.add('cards_li_selected');
			selectedCard.classList.remove('cards_li');
			numCardsSelected++;
		}else{//clicking an selected card
			console.log("deselecting card");
			selectedCard.classList.add('cards_li');
			selectedCard.classList.remove('cards_li_selected');
			numCardsSelected--;
		}

		if (selectingKitty){
			var announcement = document.getElementById("instructions");
			announcement.innerHTML = "Choose " + kittyLength + " cards to send back. (" + numCardsSelected + " out of " + kittyLength + ")";
		}

		if (selectingKitty && numCardsSelected == kittyLength && document.getElementById("partner_input").value != ""){
			$('#kitty_submit').prop("disabled",false);
		}else{
			$('#kitty_submit').prop("disabled",true);
		}
		
	});

	$('#partner_input').on('input', function() {
		if (selectingKitty && numCardsSelected == kittyLength && document.getElementById("partner_input").value != ""){
			$('#kitty_submit').prop("disabled",false);
		}else{
			$('#kitty_submit').prop("disabled",true);
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
				if ($(this).attr('class') == 'cards_li_selected'){
					var cardArray = $(this).attr('id').split(' ');
					var value = cardArray[0];
					var suit = cardArray[1];
					kitty.push({
						value: value,
						suit: suit
					})	
				}				
			});

			//gets partner
			var partnerArray = document.getElementById("partner_input").value.split(" ");

			var partner = {
				value: partnerArray[0],
				suit: partnerArray[1]
			}

			console.dir(kitty);
			console.dir(partner);

			socket.emit('new kitty', kitty);

			socket.emit('partner', partner);
			
		
	});

	socket.on('name accepted', function(data){
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

			// Create input:
			var input = document.createElement('input');
			input.setAttribute("id", "partner_input" + i);

			// Create label
			var label = document.createElement('label');
			label.setAttribute("for", "partner_input" + i);
			label.innerHTML = "Call partner " + i;


				
			// Add inputs and label to div
			partner_inputs_div.appendChild(input);
			partner_inputs_div.appendChild(label);
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

			var link = document.createElement('a');
			link.setAttribute('href', '#');
			//link.setAttribute('id', 'cards[i].value + " " + cards[i].suit');
			

			// Set link contents:
			link.appendChild(document.createTextNode(cards[i].value + " " + cards[i].suit));

			//set li contents
			item.appendChild(link);

			// Add it to the list:
			list.appendChild(item);			
		}

		cards_div.appendChild(list);

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
	
	
	socket.on('logout', function(data){
		console.dir("Player left. Total: " + data.numUsers);
		update_users(data.users);
	});
});

