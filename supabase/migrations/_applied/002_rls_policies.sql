-- Row Level Security Policies for Congruity
-- These policies control who can access what data

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view all profiles (for user search, etc.)
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================
-- SERVERS POLICIES
-- ============================================

-- Users can view servers they're members of
CREATE POLICY "Server members can view servers"
    ON public.servers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.server_members
            WHERE server_members.server_id = servers.id
            AND server_members.user_id = auth.uid()
        )
    );

-- Authenticated users can create servers
CREATE POLICY "Authenticated users can create servers"
    ON public.servers FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- Only server owners can update servers
CREATE POLICY "Server owners can update servers"
    ON public.servers FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Only server owners can delete servers
CREATE POLICY "Server owners can delete servers"
    ON public.servers FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- ============================================
-- SERVER MEMBERS POLICIES
-- ============================================

-- Server members can view other members
CREATE POLICY "Server members can view members"
    ON public.server_members FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.server_members AS sm
            WHERE sm.server_id = server_members.server_id
            AND sm.user_id = auth.uid()
        )
    );

-- Users can join servers (insert themselves)
CREATE POLICY "Users can join servers"
    ON public.server_members FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Admins and owners can manage members
CREATE POLICY "Admins can manage members"
    ON public.server_members FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.server_members AS sm
            WHERE sm.server_id = server_members.server_id
            AND sm.user_id = auth.uid()
            AND sm.role IN ('owner', 'admin')
        )
        OR user_id = auth.uid() -- Users can leave
    );

-- ============================================
-- CHANNELS POLICIES
-- ============================================

-- Server members can view channels
CREATE POLICY "Server members can view channels"
    ON public.channels FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.server_members
            WHERE server_members.server_id = channels.server_id
            AND server_members.user_id = auth.uid()
        )
    );

-- Admins and owners can create channels
CREATE POLICY "Admins can create channels"
    ON public.channels FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.server_members
            WHERE server_members.server_id = channels.server_id
            AND server_members.user_id = auth.uid()
            AND server_members.role IN ('owner', 'admin')
        )
    );

-- Admins and owners can update channels
CREATE POLICY "Admins can update channels"
    ON public.channels FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.server_members
            WHERE server_members.server_id = channels.server_id
            AND server_members.user_id = auth.uid()
            AND server_members.role IN ('owner', 'admin')
        )
    );

-- Admins and owners can delete channels
CREATE POLICY "Admins can delete channels"
    ON public.channels FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.server_members
            WHERE server_members.server_id = channels.server_id
            AND server_members.user_id = auth.uid()
            AND server_members.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- MESSAGES POLICIES
-- ============================================

-- Channel members can view messages
CREATE POLICY "Channel members can view messages"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.channels
            JOIN public.server_members ON server_members.server_id = channels.server_id
            WHERE channels.id = messages.channel_id
            AND server_members.user_id = auth.uid()
        )
    );

-- Channel members can send messages
CREATE POLICY "Channel members can send messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.channels
            JOIN public.server_members ON server_members.server_id = channels.server_id
            WHERE channels.id = messages.channel_id
            AND server_members.user_id = auth.uid()
        )
    );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own messages, moderators can delete any
CREATE POLICY "Message deletion policy"
    ON public.messages FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.channels
            JOIN public.server_members ON server_members.server_id = channels.server_id
            WHERE channels.id = messages.channel_id
            AND server_members.user_id = auth.uid()
            AND server_members.role IN ('owner', 'admin', 'moderator')
        )
    );

-- ============================================
-- DM CHANNELS POLICIES
-- ============================================

CREATE POLICY "Users can view their DM channels"
    ON public.dm_channels FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.dm_members
            WHERE dm_members.channel_id = dm_channels.id
            AND dm_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create DM channels"
    ON public.dm_channels FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================
-- DM MEMBERS POLICIES
-- ============================================

CREATE POLICY "DM members can view members"
    ON public.dm_members FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.dm_members AS dm
            WHERE dm.channel_id = dm_members.channel_id
            AND dm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add DM members"
    ON public.dm_members FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================
-- DM MESSAGES POLICIES
-- ============================================

CREATE POLICY "DM participants can view messages"
    ON public.dm_messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.dm_members
            WHERE dm_members.channel_id = dm_messages.channel_id
            AND dm_members.user_id = auth.uid()
        )
    );

CREATE POLICY "DM participants can send messages"
    ON public.dm_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.dm_members
            WHERE dm_members.channel_id = dm_messages.channel_id
            AND dm_members.user_id = auth.uid()
        )
    );

-- ============================================
-- FRIENDSHIPS POLICIES
-- ============================================

CREATE POLICY "Users can view their friendships"
    ON public.friendships FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can send friend requests"
    ON public.friendships FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update friendships involving them"
    ON public.friendships FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can delete friendships involving them"
    ON public.friendships FOR DELETE
    TO authenticated
    USING (user_id = auth.uid() OR friend_id = auth.uid());

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
