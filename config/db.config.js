const mongoose = require('mongoose');

async function connectDB() {
    try{
const conn = await mongoose.connect(process.env.DATABASE_URI);
console.log(`Database conected: ${conn.connection.host}`);

    }catch(err){
console.log(err.message);
process.exit(1);
    }
}
module.exports = {connectDB};