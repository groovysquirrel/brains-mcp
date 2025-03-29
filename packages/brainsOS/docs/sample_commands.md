#test access to our backend
test connection 

#test shortcuts
test

#test data load / display 
show system

#access to bedrock
list llm source=bedrock

#reset llms
load llm reset

#load bedrock llms that are on-demand (e.g. serverless)
load llm source=bedrock support=ON_DEMAND

#try prompting
prompt anthropic.claude-3-haiku-20240307-v1:0 "hello! What is your name?"   