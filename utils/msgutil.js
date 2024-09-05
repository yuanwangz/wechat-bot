import {
    getGroupChatMessagesBySendTime,
    getGroupChatMessages
} from './dbOperations.js';

export async function generatePromptAndContent(msgContent, groupName, startOfDay, startOfNextDay) {
    let prompt = '';
    let submitContent = '';

    // 假设这个函数已经实现，并返回类似于 Go 代码中 rows 的结果
    const messages = await getGroupChatMessagesBySendTime(groupName, startOfDay, startOfNextDay);
    if (msgContent === "/统计性格") {
        prompt = `假设你是一名精通语言学与情感分析的专家，下面我给出某个群聊信息中所有人的姓名、说话的内容聊天记录信息，例如我有一名用户，输入个具体格式内容如下：
        用户1:
            狗东西
            烦
            狗b玩意
            啊啊啊啊啊啊
            哎
            搞不懂
            我也想
        ...

        请你为我逐个分析每个人的聊天内容的概述、重点分析该人的性格，最后以一句话说明MBTI的具体类型，每个人分析的结果100字左右，具体的格式为：1、用户1，分析结果；2、用户2，分析结果`;

        const userMessages = {};

        // 整理消息到 userMessages 中
        messages.forEach(msg => {
            if (!userMessages[msg.SenderName]) {
                userMessages[msg.SenderName] = [];
            }
            userMessages[msg.SenderName].push(msg.MessageContent);
        });

        // 构建 submitContent
        for (const [senderName, messages] of Object.entries(userMessages)) {
            submitContent += `${senderName}:\n`;
            messages.forEach(message => {
                submitContent += `    ${message}\n`;
            });
        }

    } else if (msgContent === "/统计主题") {
        prompt = `假设你是一名精通语言学与文本摘要的专家，接下来我给出某个群聊信息中所有人的对话内容，格式如下：
        你好、嘻嘻、开心
        ...
        请你对该群聊对话内容进行精准的摘要，以简洁的语言对聊天内容进行对话主题描述，最终分点列出，不超过20个点。例如：1、该群聊对xx进行了探讨；2、大家持xxx观点、3、综上所述，xxx`;

        submitContent = messages.map(msg => msg.MessageContent).join('、');

    } else if (msgContent === "/总结") {
        prompt = `你是一个群聊聊天记录分析助手，我将会向你提供一个群聊的聊天记录，其中包含消息来源群组(from)，发送消息的成员(member)，时间(time)，消息正文(content)，你需要分析这段聊天记录，摘要主要内容并进行总结。回复模板：
            今日群消息AI分析报告：
            （主要内容摘要）
            ...
            主要话题：
            1、XXX，共 X 人参与（列举一到两个最火热的话题和参与人数）
            总结：今日群聊主要集中在AA、BB等相关话题或词汇上(简述此群的主要话题，主要关注什么方面)`;

        // 构建聊天记录的内容，只提取一次群组信息
        submitContent = `今日群消息记录 - from：${groupName}\n\n`;

        // 拼装消息
        messages.forEach(msg => {
            submitContent += `member：${msg.SenderName}\n`;
            submitContent += `时间(time)：${msg.SendTime}\n`;
            submitContent += `消息正文(content)：${msg.MessageContent}\n\n`;
        });

    }

    // 确保返回 prompt 和 submitContent
    return { prompt, submitContent };
}

// 新增的方法：检查最新的三条消息内容是否一致
export async function checkRecentMessages(groupName) {
    // 获取最新的5条消息
    const messages = await getGroupChatMessages(groupName, 5);

    // 如果消息数量不足 3 条，直接返回空字符串
    if (messages.length < 3) {
        return '';
    }

    // 获取前三条消息的内容
    const firstMessage = messages[0].MessageContent;
    const secondMessage = messages[1].MessageContent;
    const thirdMessage = messages[2].MessageContent;

    // 检查前三条消息的内容是否一致
    if (firstMessage === secondMessage && secondMessage === thirdMessage) {
        return firstMessage; // 返回一致的消息内容
    } else {
        return ''; // 否则返回空字符串
    }
}

