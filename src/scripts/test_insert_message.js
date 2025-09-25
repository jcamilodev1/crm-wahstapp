const { insertMessage, db } = require('../lib/database');

function runTest() {
  try {
    // Ensure a chat exists for the foreign key constraint
    const insertChat = require('../lib/database').insertChat;
    insertChat.run('chat-1', 'Test Chat', 0, 0, 0, Date.now(), 0, 0);

    insertMessage.run(
      'test-id-1',
      'chat-1',
      { text: 'object body' }, // object should be stringified by normalize at caller side; this is to ensure binding fails if not normalized
      'sender-1',
      null,
      Date.now(),
      'text',
      false,
      false,
      false,
      1,
      0
    );
    console.log('Insert executed');

    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get('test-id-1');
    console.log('Row:', row);
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    db.close();
  }
}

runTest();
