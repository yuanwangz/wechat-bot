import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv'
dotenv.config()

const pool = mysql.createPool(process.env.DATABASE_URL);

// GroupChat 操作
export async function addGroupChatMessage(groupName, senderName, messageContent) {
    try {
        const [result] = await pool.execute(
            'INSERT INTO GroupChat (GroupName, SenderName, MessageContent) VALUES (?, ?, ?)',
            [groupName, senderName, messageContent]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error adding group chat message:', error);
        throw error;
    }
}

export async function getGroupChatMessages(groupName, limit = 10) {
    try {
        const parsedLimit = parseInt(limit, 10);
        const [rows] = await pool.execute(
            'SELECT * FROM GroupChat WHERE GroupName = ? ORDER BY SendTime DESC LIMIT ?',
            [groupName,parsedLimit]
        );
        return rows;
    } catch (error) {
        console.error('Error getting group chat messages:', error);
        throw error;
    }
}

export async function getGroupChatMessagesBySendTime(groupName, startTime, endTime) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM GroupChat WHERE GroupName = ? AND SendTime >= ? AND SendTime < ?',
            [groupName, startTime, endTime]
        );
        return rows;
    } catch (error) {
        console.error('Error getting group chat messages:', error);
        throw error;
    }
}

// StockChange 操作
export async function addStockChange(stockPrice, chatCounts) {
    try {
        const [result] = await pool.execute(
            'INSERT INTO StockChange (StockPrice, ChatCounts) VALUES (?, ?)',
            [stockPrice, chatCounts]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error adding stock change:', error);
        throw error;
    }
}

export async function getStockChanges(limit = 10) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM StockChange ORDER BY Time DESC LIMIT ?',
            [limit]
        );
        return rows;
    } catch (error) {
        console.error('Error getting stock changes:', error);
        throw error;
    }
}

// 关闭连接池的方法（如果需要）
export async function closePool() {
    try {
        await pool.end();
        console.log('Database connection pool closed.');
    } catch (error) {
        console.error('Error closing database connection pool:', error);
        throw error;
    }
}

export function getBeijingDate() {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcTime + 3600000 * 8);
}
