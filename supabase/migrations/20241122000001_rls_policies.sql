-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can read their own record
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Service role can insert users (for signup flow)
CREATE POLICY "Service role can insert users"
  ON users FOR INSERT
  WITH CHECK (true);

-- Organizations table policies
-- Users can view organizations they own
CREATE POLICY "Users can view owned organizations"
  ON organizations FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can create organizations
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can update organizations they own
CREATE POLICY "Users can update owned organizations"
  ON organizations FOR UPDATE
  USING (auth.uid() = owner_id);

-- Users can delete organizations they own
CREATE POLICY "Users can delete owned organizations"
  ON organizations FOR DELETE
  USING (auth.uid() = owner_id);

-- Videos table policies (if Mux module is used)
-- Users can view their own videos
CREATE POLICY "Users can view own videos"
  ON videos FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create videos
CREATE POLICY "Users can create videos"
  ON videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own videos
CREATE POLICY "Users can update own videos"
  ON videos FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own videos
CREATE POLICY "Users can delete own videos"
  ON videos FOR DELETE
  USING (auth.uid() = user_id);

