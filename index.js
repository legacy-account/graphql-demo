const { createServer } = require('http');
const express = require('express');
const { ApolloServer, UserInputError } = require('apollo-server-express');
const { PubSub } = require('graphql-subscriptions');
const { importSchema } = require('graphql-import');
const { GraphQLScalarType, Kind } = require('graphql');

// Construct a schema, using GraphQL schema language
const typeDefs = importSchema('./graphql/schema.graphql')

// Provide resolver functions for your schema fields

// in-memory storage just for test
const books = [{
  id: 'book1',
  title: 'Some book 1',
  published: 1563726154117,
  authorId: 'erbol',
  price: '777',
  numberOfPages: 12
}, {
  id: 'book2',
  title: 'Some book 2',
  published: 1563626155111,
  authorId: 'erbol',
  price: '413',
  numberOfPages: 12
}, {
  id: 'book3',
  title: 'Some book 3',
  published: 1563722155314,
  authorId: 'erbol',
  price: '23',
  numberOfPages: 12
}, {
  id: 'book4',
  title: 'Some book 3',
  published: 1563727155115,
  authorId: 'erbol',
  price: '413',
  numberOfPages: 63
}]

const authors = [{
  id: 'erbol',
  name: 'Erbol'
}]

const BOOK_ADDED = 'BOOK_ADDED';
const pubsub = new PubSub()
const resolvers = {
  Query: {
    books: (parent, args, context) => {
      if (args.id) {
        return books.filter(book => book.id === args.id)
      }
      return books
    },

    authors: (parent, args, context) => {
      if (args.id) {
        return authors.filter(author => author.id === args.id)
      }
      return authors
    },
  },

  Book: {
    author: (book) => {
      return authors.find(author => author.id === book.authorId);
    }
  },

  Author: {
    books: (author, args) => {
      if (args.id) {
        return books.filter(book => book.id === args.id && book.authorId === author.id);
      }
      return books.filter(book => book.authorId === author.id);
    }
  },


  Mutation: {
    createBook: (root, args, context) => {
      const { book } = args;
      const authorId = book.authorId;
      const author = authors.find(author => author.id === authorId);

      if (author) {
        book.id = +new Date();
        books.push(book);
        pubsub.publish(BOOK_ADDED, { bookAdded: args.book });

        return book;
      }

      throw new UserInputError('Author is not found', {
        invalidArgs: Object.keys(args),
      });
    }
  },

  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(BOOK_ADDED),
    },
  },

  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return new Date(value); // value from the client
    },
    serialize(value) {
      return +value
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value) // ast value is always in string format
      }
      return null;
    },
  }),
};

const app = express();
const server = new ApolloServer({
  typeDefs,
  resolvers,
  playground: {
    settings: {}
  },
  introspection: true
});

server.applyMiddleware({ app })

const httpServer = createServer(app)
server.installSubscriptionHandlers(httpServer)

httpServer.listen({ port: process.env.PORT || 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
);