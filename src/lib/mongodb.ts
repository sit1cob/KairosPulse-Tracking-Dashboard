import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  // Production MongoDB URI
  const uri = process.env.MONGODB_URI || 'mongodb://kairos_admin:Sears234%23@lc-sywrelay-kairos-mongo-prod-825d03041ac5a48a.elb.us-east-2.amazonaws.com:27017/?authMechanism=SCRAM-SHA-1&authSource=kairosdb&readPreference=primaryPreferred&directConnection=true';

  if (clientPromise) {
    return clientPromise;
  }
  const options = {};

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

export default getClientPromise;

export async function getDatabase(dbName: string = 'kairosdb'): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}
