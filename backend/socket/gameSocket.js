const QuizBattle = require('../models/QuizBattle');
const GameInvite = require('../models/GameInvite');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Store online users: { userId: { socketId, year, semester, status } }
const onlineUsers = new Map();

// Store active battles: { battleId: { player1SocketId, player2SocketId } }
const activeBattles = new Map();

/**
 * Authenticate socket connection using JWT token
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

/**
 * Initialize game socket handlers
 */
const initGameSocket = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const user = socket.user;

    console.log(`User connected: ${user.username} (${userId})`);

    // Register user as online
    onlineUsers.set(userId, {
      _id: userId, // Add _id field for frontend
      socketId: socket.id,
      year: user.currentYear,
      semester: user.currentSemester,
      status: 'online',
      username: user.username,
      email: user.email,
    });

    // Broadcast updated online users to same year/semester
    broadcastOnlineUsers(io, user.currentYear, user.currentSemester);

    // Send current online users to the newly connected user immediately
    const currentUsers = Array.from(onlineUsers.values()).filter(
      (u) => u.year === user.currentYear && u.semester === user.currentSemester && u.socketId !== socket.id
    );
    socket.emit('users:online', { users: currentUsers });

    // ─── USER PRESENCE ────────────────────────────────────────────────────────

    socket.on('user:status', (status) => {
      const userInfo = onlineUsers.get(userId);
      if (userInfo) {
        userInfo.status = status; // 'online', 'idle', 'in_game'
        onlineUsers.set(userId, userInfo);
        broadcastOnlineUsers(io, user.currentYear, user.currentSemester);
      }
    });

    // Request online users list
    socket.on('users:request', () => {
      const currentUsers = Array.from(onlineUsers.values()).filter(
        (u) => u.year === user.currentYear && u.semester === user.currentSemester && u.socketId !== socket.id
      );
      socket.emit('users:online', { users: currentUsers });
    });

    // ─── GAME INVITATIONS ─────────────────────────────────────────────────────

    socket.on('invite:send', async (data) => {
      try {
        const { inviteId } = data;
        const invite = await GameInvite.findById(inviteId)
          .populate('fromUser', 'username email')
          .populate('toUser', 'username email');

        if (!invite) return;

        const targetUserInfo = onlineUsers.get(invite.toUser._id.toString());
        if (targetUserInfo) {
          io.to(targetUserInfo.socketId).emit('invite:received', {
            invite: {
              _id: invite._id,
              fromUser: invite.fromUser,
              moduleCode: invite.moduleCode,
              lectureStart: invite.lectureStart,
              lectureEnd: invite.lectureEnd,
              questionCount: invite.questionCount,
              timePerQuestion: invite.timePerQuestion,
              expiresAt: invite.expiresAt,
            },
          });
        }
      } catch (error) {
        console.error('Error sending invite:', error);
      }
    });

    socket.on('invite:accepted', async (data) => {
      try {
        const { inviteId } = data;
        const invite = await GameInvite.findById(inviteId).populate('fromUser toUser');

        if (!invite) return;

        const senderInfo = onlineUsers.get(invite.fromUser._id.toString());
        const receiverInfo = onlineUsers.get(invite.toUser._id.toString());

        // Notify sender that invite was accepted
        if (senderInfo) {
          io.to(senderInfo.socketId).emit('invite:accepted', {
            inviteId,
            acceptedBy: invite.toUser.username,
          });
        }

        // Notify both players that battle is generating
        const generatingData = {
          inviteId,
          moduleCode: invite.moduleCode,
          lectureStart: invite.lectureStart,
          lectureEnd: invite.lectureEnd,
        };

        if (senderInfo) {
          io.to(senderInfo.socketId).emit('battle:generating', generatingData);
        }
        if (receiverInfo) {
          io.to(receiverInfo.socketId).emit('battle:generating', generatingData);
        }

        // Update both users' status to in_game
        updateUserStatus(userId, 'in_game');
        updateUserStatus(invite.fromUser._id.toString(), 'in_game');
        broadcastOnlineUsers(io, user.currentYear, user.currentSemester);
      } catch (error) {
        console.error('Error handling invite acceptance:', error);
      }
    });

    socket.on('invite:rejected', async (data) => {
      try {
        const { inviteId } = data;
        const invite = await GameInvite.findById(inviteId).populate('fromUser toUser');

        if (!invite) return;

        const senderInfo = onlineUsers.get(invite.fromUser._id.toString());
        if (senderInfo) {
          io.to(senderInfo.socketId).emit('invite:rejected', {
            inviteId,
            rejectedBy: invite.toUser.username,
          });
        }
      } catch (error) {
        console.error('Error handling invite rejection:', error);
      }
    });

    // ─── BATTLE ROOM ──────────────────────────────────────────────────────────

    socket.on('battle:join', async (data) => {
      try {
        const { battleId } = data;
        const battle = await QuizBattle.findById(battleId);

        if (!battle) {
          socket.emit('battle:error', { message: 'Battle not found' });
          return;
        }

        // Verify user is a participant
        const isPlayer1 = battle.player1.toString() === userId;
        const isPlayer2 = battle.player2.toString() === userId;

        if (!isPlayer1 && !isPlayer2) {
          socket.emit('battle:error', { message: 'Not authorized' });
          return;
        }

        // Join battle room
        socket.join(`battle:${battleId}`);

        // Track battle participants
        if (!activeBattles.has(battleId)) {
          activeBattles.set(battleId, {});
        }

        const battleRoom = activeBattles.get(battleId);
        if (isPlayer1) {
          battleRoom.player1SocketId = socket.id;
        } else {
          battleRoom.player2SocketId = socket.id;
        }

        // Check if both players are ready
        if (battleRoom.player1SocketId && battleRoom.player2SocketId) {
          // Start battle if not already started
          if (battle.status === 'waiting') {
            battle.status = 'active';
            battle.startedAt = new Date();
            await battle.save();

            // Send first question to both players
            io.to(`battle:${battleId}`).emit('battle:started', {
              battleId,
              currentQuestionIndex: 0,
              question: sanitizeQuestion(battle.questions[0]),
              timePerQuestion: battle.timePerQuestion,
            });
          } else if (battle.status === 'active') {
            // Reconnection - send current state
            socket.emit('battle:reconnected', {
              battleId,
              currentQuestionIndex: battle.currentQuestionIndex,
              question: sanitizeQuestion(battle.questions[battle.currentQuestionIndex]),
              player1Score: battle.player1Score,
              player2Score: battle.player2Score,
            });
          }
        } else {
          socket.emit('battle:waiting', { message: 'Waiting for opponent...' });
        }
      } catch (error) {
        console.error('Error joining battle:', error);
        socket.emit('battle:error', { message: 'Failed to join battle' });
      }
    });

    socket.on('battle:answer', async (data) => {
      try {
        const { battleId, questionIndex, selectedAnswer, timeSpent } = data;

        const battle = await QuizBattle.findById(battleId);
        if (!battle || battle.status !== 'active') {
          return;
        }

        const isPlayer1 = battle.player1.toString() === userId;
        const isPlayer2 = battle.player2.toString() === userId;

        if (!isPlayer1 && !isPlayer2) return;

        // Validate question index
        if (questionIndex !== battle.currentQuestionIndex) {
          socket.emit('battle:error', { message: 'Invalid question index' });
          return;
        }

        const question = battle.questions[questionIndex];
        const isCorrect = selectedAnswer === question.answerIndex;

        const answerRecord = {
          questionIndex,
          selectedAnswer,
          isCorrect,
          answeredAt: new Date(),
          timeSpent: timeSpent || 0,
        };

        // Store answer
        if (isPlayer1) {
          // Check if already answered
          const alreadyAnswered = battle.player1Answers.some((a) => a.questionIndex === questionIndex);
          if (alreadyAnswered) return;

          battle.player1Answers.push(answerRecord);
          if (isCorrect) battle.player1Score += 1;
        } else {
          const alreadyAnswered = battle.player2Answers.some((a) => a.questionIndex === questionIndex);
          if (alreadyAnswered) return;

          battle.player2Answers.push(answerRecord);
          if (isCorrect) battle.player2Score += 1;
        }

        await battle.save();

        // Notify both players of answer submission
        io.to(`battle:${battleId}`).emit('battle:answer_submitted', {
          playerId: userId,
          questionIndex,
          player1Score: battle.player1Score,
          player2Score: battle.player2Score,
        });

        // Check if both players answered
        const player1Answered = battle.player1Answers.some((a) => a.questionIndex === questionIndex);
        const player2Answered = battle.player2Answers.some((a) => a.questionIndex === questionIndex);

        if (player1Answered && player2Answered) {
          // Move to next question or finish
          await moveToNextQuestion(io, battle);
        }
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    socket.on('battle:timeout', async (data) => {
      try {
        const { battleId, questionIndex } = data;
        const battle = await QuizBattle.findById(battleId);

        if (!battle || battle.status !== 'active') return;

        const isPlayer1 = battle.player1.toString() === userId;
        const isPlayer2 = battle.player2.toString() === userId;

        if (!isPlayer1 && !isPlayer2) return;

        // Record timeout as incorrect answer
        const answerRecord = {
          questionIndex,
          selectedAnswer: -1, // -1 indicates timeout/no answer
          isCorrect: false,
          answeredAt: new Date(),
          timeSpent: battle.timePerQuestion * 1000,
        };

        if (isPlayer1) {
          const alreadyAnswered = battle.player1Answers.some((a) => a.questionIndex === questionIndex);
          if (!alreadyAnswered) {
            battle.player1Answers.push(answerRecord);
          }
        } else {
          const alreadyAnswered = battle.player2Answers.some((a) => a.questionIndex === questionIndex);
          if (!alreadyAnswered) {
            battle.player2Answers.push(answerRecord);
          }
        }

        await battle.save();

        // Check if both players finished (answered or timed out)
        const player1Answered = battle.player1Answers.some((a) => a.questionIndex === questionIndex);
        const player2Answered = battle.player2Answers.some((a) => a.questionIndex === questionIndex);

        if (player1Answered && player2Answered) {
          await moveToNextQuestion(io, battle);
        }
      } catch (error) {
        console.error('Error handling timeout:', error);
      }
    });

    socket.on('battle:reaction', (data) => {
      try {
        const { battleId, emoji } = data;
        
        // Broadcast reaction to the other player in the battle room
        socket.to(`battle:${battleId}`).emit('battle:reaction_received', {
          emoji,
          playerId: userId,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Error handling reaction:', error);
      }
    });

    socket.on('battle:surrender', async (data) => {
      try {
        const { battleId } = data;
        const battle = await QuizBattle.findById(battleId).populate('player1 player2', 'username email');

        if (!battle || battle.status !== 'active') {
          socket.emit('battle:error', { message: 'Battle not found or already finished' });
          return;
        }

        const isPlayer1 = battle.player1._id.toString() === userId;
        const isPlayer2 = battle.player2._id.toString() === userId;

        if (!isPlayer1 && !isPlayer2) {
          socket.emit('battle:error', { message: 'Not authorized' });
          return;
        }

        // Determine winner (the player who didn't surrender)
        const surrenderingPlayer = isPlayer1 ? battle.player1 : battle.player2;
        const winningPlayer = isPlayer1 ? battle.player2 : battle.player1;

        // Update battle status
        battle.status = 'finished';
        battle.finishedAt = new Date();
        battle.winner = winningPlayer._id;
        await battle.save();

        // Notify both players
        io.to(`battle:${battleId}`).emit('battle:surrendered', {
          battleId: battle._id,
          surrenderedBy: {
            _id: surrenderingPlayer._id,
            username: surrenderingPlayer.username,
          },
          winner: {
            _id: winningPlayer._id,
            username: winningPlayer.username,
          },
          player1Score: battle.player1Score,
          player2Score: battle.player2Score,
        });

        // Update user statuses back to online
        updateUserStatus(battle.player1._id.toString(), 'online');
        updateUserStatus(battle.player2._id.toString(), 'online');

        // Clean up active battle
        activeBattles.delete(battle._id.toString());

        // Broadcast updated online users
        broadcastOnlineUsers(io, battle.player1.currentYear, battle.player1.currentSemester);
      } catch (error) {
        console.error('Error handling surrender:', error);
        socket.emit('battle:error', { message: 'Failed to surrender' });
      }
    });

    // ─── DISCONNECT ───────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user.username} (${userId})`);
      onlineUsers.delete(userId);
      broadcastOnlineUsers(io, user.currentYear, user.currentSemester);
    });
  });
};

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Broadcast online users to all users in same year/semester
 */
function broadcastOnlineUsers(io, year, semester) {
  const users = Array.from(onlineUsers.values()).filter(
    (u) => u.year === year && u.semester === semester
  );

  console.log(`Broadcasting to year ${year}, semester ${semester}: ${users.length} users online`);

  // Send to all users in this year/semester
  onlineUsers.forEach((userInfo) => {
    if (userInfo.year === year && userInfo.semester === semester) {
      const filteredUsers = users.filter((u) => u.socketId !== userInfo.socketId);
      console.log(`Sending to ${userInfo.username}: ${filteredUsers.length} other users`);
      io.to(userInfo.socketId).emit('users:online', {
        users: filteredUsers, // Exclude self
      });
    }
  });
}

/**
 * Update user status
 */
function updateUserStatus(userId, status) {
  const userInfo = onlineUsers.get(userId);
  if (userInfo) {
    userInfo.status = status;
    onlineUsers.set(userId, userInfo);
  }
}

/**
 * Remove answer from question (don't expose correct answer until after submission)
 */
function sanitizeQuestion(question) {
  return {
    q: question.q,
    options: question.options,
    // Don't send answerIndex to client
  };
}

/**
 * Move to next question or finish battle
 */
async function moveToNextQuestion(io, battle) {
  const nextIndex = battle.currentQuestionIndex + 1;

  if (nextIndex < battle.questions.length) {
    // Move to next question
    battle.currentQuestionIndex = nextIndex;
    await battle.save();

    setTimeout(() => {
      io.to(`battle:${battle._id}`).emit('battle:next_question', {
        currentQuestionIndex: nextIndex,
        question: sanitizeQuestion(battle.questions[nextIndex]),
        player1Score: battle.player1Score,
        player2Score: battle.player2Score,
      });
    }, 2000); // 2 second delay before next question
  } else {
    // Battle finished
    battle.status = 'finished';
    battle.finishedAt = new Date();

    // Determine winner
    if (battle.player1Score > battle.player2Score) {
      battle.winner = battle.player1;
    } else if (battle.player2Score > battle.player1Score) {
      battle.winner = battle.player2;
    }
    // else it's a draw (winner remains null)

    await battle.save();

    // Populate winner info
    await battle.populate('winner', 'username email');

    io.to(`battle:${battle._id}`).emit('battle:finished', {
      battleId: battle._id,
      player1Score: battle.player1Score,
      player2Score: battle.player2Score,
      winner: battle.winner,
      isDraw: !battle.winner,
    });

    // Update user statuses back to online
    updateUserStatus(battle.player1.toString(), 'online');
    updateUserStatus(battle.player2.toString(), 'online');

    // Clean up active battle
    activeBattles.delete(battle._id.toString());

    // Broadcast updated online users
    const battleDoc = await battle.populate('player1 player2');
    broadcastOnlineUsers(io, battleDoc.player1.currentYear, battleDoc.player1.currentSemester);
  }
}

module.exports = { initGameSocket, getOnlineUsers: () => onlineUsers };
