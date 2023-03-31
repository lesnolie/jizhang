## 介绍
这是一个基于Notion和GitHub Actions的记账小组件，它可以让你在iOS设备上使用Scriptable应用程序方便地查看你的月度支出、高价消费次数、食物和非食物支出。本小组件可帮助你更好地了解你的消费习惯，从而实现更明智的理财。

## 更新
- 修复了时区的错误，使用北京时区。


## 如何使用这个记账小组件？
### 请按照以下步骤使用这个小组件：

1. 安装记账快捷指令：- [点击在你的iOS设备上安装快捷指令。](https://www.icloud.com/shortcuts/899a6c3faa4248adb6934292885d3433)
                   - [记账OPENCAT版](https://t.co/Q3lVOfhZBN)
2. 在记账快捷指令中输入你的**OpenAI Token**、**Notion API Key**和**Notion 数据库URL的databaseid**（❓前面那串数字）。
3. 在Notion中创建一个记账页面，包含以下三个属性：**内容（title）**、**类目（select）** 和 **价格（Number）**。
4. Fork这个仓库，将其复制到你的GitHub帐户中。
5. 在你fork的仓库的Settings页面，找到"Secrets"，添加以下的GitHub Actions密钥：**NOTION_DATABASE_ID**、**NOTION_API_KEY**和**G_T（github_token)**。
6. 打开github action执行文件，修改你自己的Issue地址。
7. 将Scriptable代码复制到你的iOS设备上的Scriptable应用程序中，并替换里面的**GITHUB URL地址**和**GITHUB_Token**为你的。

现在，你可以在iOS设备上使用这个记账小组件来查看你的支出概况：**你可以手动输入，也可以使用hey siri,记账来记账。**
你可以问chatgpt让他给你修改小组件的UI。

❗注意事项
- 请确保你的Notion数据库具有正确的属性名称和类型，否则数据可能无法正确显示。
- 如果GitHub TOKEN密钥发生更改，请记得更新Scriptable中的代码以确保小组件能够正常运行。
- 这个小组件仅提供月度支出概况，如果你需要更详细的数据分析，可以直接查看Notion中的数据库。
- 记得修改快捷指令名字为记账，才能用hey siri,记账唤醒。
祝你使用愉快！

## 最后
如果你感到好用，谢谢就好
