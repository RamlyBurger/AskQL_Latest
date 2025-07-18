-- Database table to store information about different databases we're analyzing
CREATE TABLE "database" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "database_type" VARCHAR(50) NOT NULL,  -- postgresql, mysql, etc.
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store information about tables in each database
CREATE TABLE "table" (
    "id" SERIAL PRIMARY KEY,
    "database_id" INTEGER REFERENCES "database"(id) ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store information about attributes (columns) in each table
CREATE TABLE "attribute" (
    "id" SERIAL PRIMARY KEY,
    "table_id" INTEGER REFERENCES "table"(id) ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "data_type" VARCHAR(50) NOT NULL,  -- Store the data type of the column
    "is_nullable" BOOLEAN DEFAULT true,
    "is_primary_key" BOOLEAN DEFAULT false,
    "is_foreign_key" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store the actual data samples for each table
CREATE TABLE "table_data" (
    "id" SERIAL PRIMARY KEY,
    "table_id" INTEGER REFERENCES "table"(id) ON DELETE CASCADE,
    "row_data" JSONB NOT NULL,  -- Store row data as JSON
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store chat messages
CREATE TABLE "chat_message" (
    "id" SERIAL PRIMARY KEY,
    "database_id" INTEGER REFERENCES "database"(id) ON DELETE CASCADE,
    "sender" VARCHAR(10) NOT NULL,  -- 'user' or 'bot'
    "content" TEXT NOT NULL,
    "attachment_path" VARCHAR(512),  -- Path to attached file (image/document)
    "audio_path" VARCHAR(512),      -- Path to voice message
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX idx_table_database_id ON "table"(database_id);
CREATE INDEX idx_attribute_table_id ON "attribute"(table_id);
CREATE INDEX idx_table_data_table_id ON "table_data"(table_id);
CREATE INDEX idx_chat_message_database_id ON "chat_message"(database_id);
CREATE INDEX idx_chat_message_created_at ON "chat_message"(created_at DESC);

-- Add unique constraints
ALTER TABLE "database" ADD CONSTRAINT unique_database_name UNIQUE ("name");
ALTER TABLE "table" ADD CONSTRAINT unique_table_name_per_database UNIQUE ("database_id", "name");
ALTER TABLE "attribute" ADD CONSTRAINT unique_attribute_name_per_table UNIQUE ("table_id", "name");

-- Add GIN index for JSONB data for better JSON querying performance
CREATE INDEX idx_table_data_gin ON "table_data" USING GIN (row_data);
