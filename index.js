const { createServer } = require('http');
const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { PubSub } = require('graphql-subscriptions');
const { importSchema } = require('graphql-import');

// Construct a schema, using GraphQL schema language
const typeDefs = importSchema('./graphql/schema.graphql')

// Provide resolver functions for your schema fields
const POST_ADDED = 'POST_ADDED';
const pubsub = new PubSub();
const resolvers = {
  Query: {
    test: () => 'Hello world!',
    post: () => ({
      comments: [],
      id: 'test',
      text: 'Some post',
      tags: ['some tag']
    })
  },

  Mutation: {
    createPost: (root, args, context) => {
      console.log('root', root)
      console.log('args', args)
      console.log('context', context)
      pubsub.publish(POST_ADDED, { postAdded: args.post });
      return args.post
    }
  },

  Subscription: {
    postAdded: {
      subscribe: () => pubsub.asyncIterator(POST_ADDED),
    },
  },

  Post: {
    tags () {
      return ['ew', 'w']
    }
  }
};

const app = express();
const server = new ApolloServer({
  typeDefs,
  resolvers,
  playground: {
    settings: {
      // "editor.theme": 'light'
    }
  }
});

server.applyMiddleware({ app })

const httpServer = createServer(app)
server.installSubscriptionHandlers(httpServer)

httpServer.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
);