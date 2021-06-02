/*
Edited by Matthew on December 2, 2020
*/

//FirebaseUI Stuff
var firebaseConfig = {
	apiKey: "AIzaSyABvNimuYmEwwlKqxFthpA1qEv7MqGdToI",
	authDomain: "rook-37dd0.firebaseapp.com",
	projectId: "rook-37dd0",
	storageBucket: "rook-37dd0.appspot.com",
	messagingSenderId: "277513361139",
	appId: "1:277513361139:web:f70687497e8b9ee87d8986",
	measurementId: "G-1B52YEY4ZL"
};

var uiConfig = {
    callbacks: {
        signInSuccessWithAuthResult: function (authResult, redirectUrl) {
            // User successfully signed in.
            // Return type determines whether we continue the redirect automatically
            // or whether we leave that to developer to handle.
            return false;
        },
        uiShown: function () {
            // The widget is rendered.
            // Hide the loader.
            document.getElementById('loader').style.display = 'none';
        }
    },
    // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
    signInFlow: 'popup',
    //signInSuccessUrl: '<url-to-redirect-to-on-success>',
    signInOptions: [
        // Leave the lines as is for the providers you want to offer your users.
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
    ]
    // Terms of service url.
    //tosUrl: '<your-tos-url>',
    // Privacy policy url.
    //privacyPolicyUrl: '<your-privacy-policy-url>'
};

firebase.initializeApp(firebaseConfig);

var ui = new firebaseui.auth.AuthUI(firebase.auth());

initApp = function () {
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            // User is signed in.
            var displayName = user.displayName;
            var email = user.email;
            var emailVerified = user.emailVerified;
            var photoURL = user.photoURL;
            var uid = user.uid;
            var phoneNumber = user.phoneNumber;
            var providerData = user.providerData;
            user.getIdToken().then(function (accessToken) {
                document.getElementById('sign-in-status').textContent = 'Signed in';
                document.getElementById('sign-in').textContent = 'Sign out';
                document.getElementById('account-details').textContent = JSON.stringify({
                    displayName: displayName,
                    email: email,
                    emailVerified: emailVerified,
                    phoneNumber: phoneNumber,
                    photoURL: photoURL,
                    uid: uid,
                    accessToken: accessToken,
                    providerData: providerData
                }, null, '  ');
            });
        } else {
            // User is signed out.
            document.getElementById('sign-in-status').textContent = 'Signed out';
            document.getElementById('sign-in').textContent = 'Sign in';
            document.getElementById('account-details').textContent = 'null';

            // Initialize Firebase


            ui.start('#firebaseui-auth-container', uiConfig);
        }
    }, function (error) {
        console.log(error);
    });
};


$(function () {
	var socket = io();
	var username;
	var player;
	var numCardsSelected = 0;
	var selectingKitty = false;
	var kittyLength = 0;
	var numPlayers = 0;
	var playingCard = false;
	var bidding = true;

	//lobby vars
	var lobby_name;
	var lobby_size;
	var lobby_privacy;

	$( document ).ready(function() {
		initApp();
	});

	$('#sign_in').submit(function(e){
		e.preventDefault(); // prevents page reloading
			//tell server the username
			username = $('#name_input').val().trim();
			socket.emit('login', username);
	});






	socket.on('lobby list', function(data){
		if(data.lobbies.length > 0){
			console.dir(data.lobbies);
			$('#lobby_list_status').hide();
			$('#lobbies_table').show();
			update_lobbies(data.lobbies);

		}else{
			console.log("no lobbies, not displaying lobby list.")
			$('#lobby_list_status').show();
			$('#lobbies_table').hide();
		}
	});

	socket.on('lobby name taken', function(){
		console.log("lobby name taken");
		document.getElementById("lobby_name_taken").innerHTML = "Lobby name already taken. Please try again with another name";
	});

	$('#create_lobby').submit(function(e){
		e.preventDefault(); // prevents page reloading

		//clear alerts
		document.getElementById("lobby_name_taken").innerHTML = "";

		console.log("creating lobby");
		lobby_name = $('#lobby_name_input').val().trim();
		lobby_size = $('#lobby_size_input').val();
		lobby_privacy = $('#lobby_privacy_input').is(":checked");

		socket.emit('create lobby', {
			lobby_name: lobby_name,
			lobby_size: lobby_size,
			lobby_privacy: lobby_privacy
		});

	});

	//using a callback from the server, rather than immedietely joining a lobby after created above enables us to prevent a user from joining a lobby that has already been created when they try to create the same lobby.
	socket.on('lobby created', function () {
		socket.emit('join lobby', lobby_name);
	});

	//I had to use document jquery selector to be able to access these appended items
	$(document).on('click', "#join_lobby", function() {
		console.log("joining lobby: " + $(this).attr("value"))
		socket.emit('join lobby', $(this).attr("value"));
	});

	$(document).on('click', "#spectate_lobby", function() {
		console.log("spectating lobby. Not currently implemented.");
		socket.emit('spectate lobby', $(this).attr("value"));
	});
		
	$('#leave_lobby').click(function(){
		//Tell the server we're leaving the lobby
		socket.emit('leave lobby', lobby_name);
	});

	//not finished
	$('#sign-out').click(function(){
		
		firebase.auth().signOut();

		//tell server we're signing out
		
	});


	$('#start_game').click(function(){
			//Tell the server to setup/start the game
			socket.emit('start game');
		
	});


	$('#bid_action').click(function(){
		if (bidding){
			console.log("placing bid");
		
			//Tell the server to setup/start the game
			var bid = document.getElementById('bid_input').value;
			var bid_label = document.getElementById('bid_label');
			
			//input checking
			if ((bid != "pass" && bid < 80 ) || (bid != "pass" && bid > 200 && bid < 400)){
				bid_label.innerHTML = "Bid not valid";
			}else{
				bid_label.innerHTML = "";
				socket.emit('bid', bid);
				
			}
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
				//var announcement = document.getElementById("instructions");
				//announcement.innerHTML = "Choose " + kittyLength + " cards to send back. (" + numCardsSelected + " out of " + kittyLength + ")";

				//It's important to make sure that we get a valid count for the number of cards selected. It's possible for them to get off sync if they have some selected when they get sent a new hand.
				numCardsSelected = 0;
				$('#cards_ul').children('li').each(function () {
					if ($(this).children(':first').attr('class').includes("selected")){
						numCardsSelected++;		
					}				
				});

				document.getElementById("turn_notifier").innerHTML = "Choose " + kittyLength + " cards to send back. (" + numCardsSelected + " out of " + kittyLength + ")";
			}
	
			if (selectingKitty && numCardsSelected == kittyLength){
				$('#kitty_submit').prop("disabled",false);
			}else{
				$('#kitty_submit').prop("disabled",true);
			}

		}else if (!bidding){
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
		}else{
			console.log("you're not allowed to play a card while bidding")
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
			
			//make sure the system doesn't think this player is selecting a kitty anymore
			selectingKitty = false;
			
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
		//display proper divs
		$('#sign_in_div').hide();
		$('#lobby_selection').show();
		
		//reset username taken div
		document.getElementById("username_taken").innerHTML = "";
	});

	socket.on('name in use', function(){
		console.dir("That name is already in use, please choose another.");
		document.getElementById("username_taken").innerHTML = "Name already taken. Please try again with another name";
	});

	socket.on('sent to prelobby', function () {
		console.dir("being sent to lobby");

		lobby_name = undefined;
		lobby_size = undefined;
		lobby_privacy = undefined;

		$('.lobby').hide();
		$('.messaging').hide();
		$('#lobby_selection').show();
		$('#lobby_players_list').text("");


	});

	socket.on('sent to lobby', function (lobby) {
		console.dir("being sent to lobby");

		lobby_name = lobby.name;
		lobby_size = lobby.capacity;
		lobby_privacy = lobby.privacy;


		$('.username').hide();
		$('#lobby_selection').hide();
		$('.lobby').show();
		$('.messaging').show();

		$('#lobby_players_list').text("Players List for " + lobby_name);


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

		//tab alert for new message?
		//make it on the right side of the screen
	});
	
	socket.on('new player in lobby', function(data){
		console.dir("New player. Total: " + data.numUsers);

		update_users(data.users);

		console.dir(data);
	});
	

	socket.on('start bidding', function(data){
		//Hide Lobby
		$('.lobby').hide();
		$('.playing_area').show();
		$('#bidding_div').show();
		
		//set global variable for total number of players
		numPlayers = data.order.length;

		//make sure the system doesn't think anyone is selecting a kitty
		selectingKitty = false;
		
		//keep the system from sending this card in
		playingCard = false;
		bidding = true;


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

	socket.on('bid too low', function(){
		var bid_label = document.getElementById('bid_label');
		bid_label.innerHTML = "Bid not valid";		
	});

	socket.on('not your turn', function(){
		var bid_label = document.getElementById('bid_label');
		bid_label.innerHTML = "It's not your turn, you little hacker.";		
	});
	
	socket.on('bidding ended', function(data){
		console.log("bidding has ended");
		console.dir(data);
		
		bidding = false;

		//show announcements
		var announcement = document.getElementById("announcements");
		announcement.innerHTML = "Final bid = " + data.currentBid + " by " + data.highestBidder;
		
		$('#bidding_div').hide();
		
		//clear all bolds and skips			
		$('#opponents').children('div').each(function () {
			$(this).children().first().css("font-weight","");
		});

		//clear turn
		document.getElementById("turn_notifier").innerHTML = "";
		
		
	});

	socket.on('kitty contents', function(data){
		console.log("receiving kitty");
		
		var kitty = data.kitty;
		var numPartners = data.numPartners;

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

		//update that the user isn't playing a card
		playingCard = false;

		//This next section handles choosing 0-2 partners
		//var numPartners = (Math.floor(numPlayers/2) - 1); This is now handled on the server

		var partner_inputs_div = document.getElementById("partner_inputs");
		
		//clears div from previous filling
		partner_inputs_div.innerHTML = "";

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

		//set bidding to false
		bidding = false;

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

		//wait to change stuff so people can see last card
		//setTimeout(function(){

			//bold current player
			update_player(data.order, username, data.turn);

			//remove previously played cards
			document.getElementById('card_pile').innerHTML = "";

			//tell users who won previous trick
			document.getElementById('last_trick_winner').innerHTML = "Last Trick Winner: " + data.order[data.turn].username;


		//}, 3000);


		
	});

	socket.on('update scores', function(data){
		console.log("updating scores");
		console.dir(data);

		//update scores
		display_opponents(data.order, player.turnnum);//this doesn't seem to be updating scores properly. Could be a problem on server end.

		//tell users who won previous trick
		document.getElementById('last_trick_winner').innerHTML = "Last Trick Winner: " + data.order[data.turn].username;
		
	});
	
		
	socket.on('must play color of trick', function(){
		console.log("You have trick color, but you tried to play another color");
	});

	socket.on('round end', function(data){
		console.log("Round over. Player info coming in..");
		var order = data.order;
		
		display_opponents(order, player.turnnum);
		
		//show announcements
		var announcement = document.getElementById("announcements");
		announcement.innerHTML = "Start Bidding";

		//update some visual stuff (not sure if this is the right place for this)
		document.getElementById("kitty_points_p").innerHTML = "(There may or may not be points)";

		//hide "last trick winner"
		document.getElementById('last_trick_winner').innerHTML = "";
		
		//set bidder
		update_bidder(order, player.username, 0);
		
		
	});

	socket.on('game over', function(data){
		console.log("Game over. winner info coming in..");
		document.getElementById("card_pile").innerHTML = "Game Over<br />The winner is: " + data.winner + ".<br />They won with " + data.points + " points!";

		for (var i = 0; i < data.players.length; i++){

			if (data.players[i].username != data.winner){

				// Create the list item:
				var item = document.createElement('li');

				// Set its contents:
				item.appendChild(document.createTextNode(data.players[i].username + ": " + data.players[i].points + " points"));

				// Add new div to opponents div
				document.getElementById("card_pile").appendChild(item);


			}

		}

		$("#card_pile").append("<br /><br />You are returning to the lobby in 15 seconds");

	});
	

	socket.on('to lobby', function(data){
		document.getElementById("card_pile").innerHTML = "";
		console.log("You are being moved to the lobby");
		console.dir(data);
		
		update_users(data.users);

		$('.lobby').show();
		$('.playing_area').hide();
	});
	

	
	const update_player = (order, myUsername, turn) => {
		
		var currentPlayer = order[turn].username;
		
		var turn_notifier = document.getElementById("turn_notifier");

		console.log("Current player: " + currentPlayer);
		
		if (currentPlayer == myUsername){
			//indicate it is my turn
			//$('#bid_action').prop("disabled",false);
			
			

			if (!bidding){
				console.log("It is my turn to play a card");
				playingCard = true;
				turn_notifier.innerHTML = "It is your turn to play a card";
				
			}else{
				console.log("It is my turn to bid");
				turn_notifier.innerHTML = "It is your turn to place a bid";
			}

			//clear bolds from opponents
			$('#opponents').children('div').each(function () {
				$(this).children().first().css("font-weight","");
			});
			
		}else{
			//indicate it is not my turn
			//$('#bid_action').prop("disabled",true);
			
			console.log("It is not my turn to play a card");
			turn_notifier.innerHTML = "";
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
	
		currentBidder = order[turn].username;
		var turn_notifier = document.getElementById("turn_notifier");

		if (currentBidder == myUsername){
			//indicate it is my turn
			$('#bid_action').prop("disabled",false);
			turn_notifier.innerHTML = "It is your turn to place a bid";
			console.log("It is my turn to bid");
			//clear bolds from opponents
			$('#opponents').children('div').each(function () {
				$(this).children().first().css("font-weight","");
			});
			
		}else{
			//indicate it is not my turn
			$('#bid_action').prop("disabled",true);
			turn_notifier.innerHTML = "";
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
		opponents.innerHTML = "";


		
	    for (var i = myPosition; i < order.length + myPosition; i++) { //This is a little weird, but you need to start in the middle of the array so that you can iterate through and place the competitors in the right order. This is also why you need to the modulus on the index a few lines down.
			
			if (i != myPosition){//prevents you from getting added to the list of other players

				// Create div for each opponent
				var list = document.createElement('div');
				list.setAttribute("id", "opponents_div");

				// Create the list item:
				var item = document.createElement('li');
				item.setAttribute("id", order[i % order.length].username);

				// Set its contents:
				item.appendChild(document.createTextNode(order[i % order.length].username + " (" + order[i % order.length].points + " points)"));



				// Add it to the div:
				list.appendChild(item);
				
				// Add new div to opponents div
				opponents.appendChild(list);

			}else{
				//update my points
				document.getElementById("my_points").innerHTML = "My total points: " + order[i % order.length].points;
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

	const update_lobbies = (lobbies) => {
		var lobbies_table = document.getElementById('lobbies_table');
		lobbies_table.innerHTML = "";

		console.dir(lobbies);

		$("#lobbies_table").append("<tr>" + 
		"<th>" + "Name" + "</th>" +
		"<th>" + "Participants" + "</th>" +
		"<th>" + "Current State " + "</th>" +
		"<th>" + "Actions" + "</th>" +
		"</tr>");

		for (var i = 0; i < lobbies.length; i++){

			console.log("looping");

			$("#lobbies_table").append("<tr>" + 
			"<td>" + lobbies[i].name + "</td>" +
			"<td>" + lobbies[i].participants.length + "/" + lobbies[i].capacity + "</td>" +
			"<td>" + lobbies[i].state + "</td>" +
			"<td>" + "<button id=\"join_lobby\" value=\"" + lobbies[i].name + "\">Join</button>" + " | " + "<button id=\"spectate_lobby\" value=\"" + lobbies[i].name + "\">Spectate</button>" + "</td>" +
			"</tr>");

		}

		//lobbies_div.style.display='none';
		//lobbies_div.offsetHeight; // no need to store this anywhere, the reference is enough
		//lobbies_div.style.display='block';


		/*
		var list = document.createElement('ul');

		for (var i = 0; i < lobbies.length; i++){
			lobbies_div.ap
			// Create the list item:
			var item = document.createElement('li');

			// Set its contents:
			item.appendChild(document.createTextNode(lobbies[i].lobby_name));

			// Add it to the list:
			list.appendChild(item);	
		}

		lobbies_div.appendChild(list);*/
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
			start_game_label.innerHTML = "You have too many players. The maximum number of players is " + lobby_size + ". You currently have " + users.length + ".";
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
 

	//Handle states by showing or hiding elements
	const display_lobby_selection = () => {

	}

});

