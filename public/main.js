/*
Edited by Matthew on December 2, 2020
*/
$(function () {
	var socket = io();
	var username;

	$('#join_lobby').submit(function(e){
		e.preventDefault(); // prevents page reloading
			//tell server the username
			username = $('#name_input').val().trim();
			socket.emit('add user', username);
		
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
			item.appendChild(document.createTextNode(users[i]));

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

