function setupSocket(io) {

  io.on('connection', socket => {

    console.log(
      '[socket] dashboard connected:',
      socket.id
    );

    socket.on('disconnect', () => {

      console.log(
        '[socket] disconnected:',
        socket.id
      );
    });
  });
}

module.exports = setupSocket;