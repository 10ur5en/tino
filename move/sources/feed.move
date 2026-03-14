module tino_feed::feed {
    use std::string::{String};
    use std::signer;
    use std::vector;
    use aptos_std::table::{Self, Table};

    /// Post reference: author + blob name on Shelby + timestamp
    struct Post has store, drop {
        author: address,
        blob_name: String,
        timestamp: u64,
    }

    /// Comment reference: post index, commenter, blob name, timestamp
    struct Comment has store, drop {
        post_index: u64,
        commenter: address,
        blob_name: String,
        timestamp: u64,
    }

    /// Global feed state: posts, comments, likes per post, deleted post indices
    struct FeedRegistry has key {
        posts: vector<Post>,
        comments: vector<Comment>,
        /// post_index -> vector of addresses who liked
        likes: Table<u64, vector<address>>,
        /// post_index -> true when post is deleted (only author can delete)
        deleted: Table<u64, bool>,
    }

    /// Initialize the feed when the module is published. Feed registry is stored at deployer's address.
    fun init_module(deployer: &signer) {
        move_to(deployer, FeedRegistry {
            posts: vector::empty(),
            comments: vector::empty(),
            likes: table::new(),
            deleted: table::new(),
        });
    }

    /// Register a new post. Caller must have uploaded the blob to Shelby under their account first.
    public entry fun register_post(
        account: &signer,
        feed_owner: address,
        blob_name: String,
        timestamp: u64,
    ) acquires FeedRegistry {
        let author = signer::address_of(account);
        let registry = borrow_global_mut<FeedRegistry>(feed_owner);
        vector::push_back(&mut registry.posts, Post {
            author,
            blob_name,
            timestamp,
        });
    }

    /// Like a post by index. Idempotent: if already liked, does nothing.
    public entry fun like_post(
        account: &signer,
        feed_owner: address,
        post_index: u64,
    ) acquires FeedRegistry {
        let registry = borrow_global<FeedRegistry>(feed_owner);
        assert!(post_index < vector::length(&registry.posts), 1);
        let _ = registry;
        let registry_mut = borrow_global_mut<FeedRegistry>(feed_owner);
        let liker = signer::address_of(account);
        if (!table::contains(&registry_mut.likes, post_index)) {
            let v = vector::empty<address>();
            vector::push_back(&mut v, liker);
            table::add(&mut registry_mut.likes, post_index, v);
        } else {
            let likers = table::borrow_mut(&mut registry_mut.likes, post_index);
            let len = vector::length(likers);
            let i = 0u64;
            while (i < len) {
                if (*vector::borrow(likers, i) == liker) {
                    return
                };
                i = i + 1;
            };
            vector::push_back(likers, liker);
        };
    }

    /// Delete a post. Only the post author can delete. Post is hidden from feed (soft delete).
    public entry fun delete_post(
        account: &signer,
        feed_owner: address,
        post_index: u64,
    ) acquires FeedRegistry {
        let registry = borrow_global<FeedRegistry>(feed_owner);
        assert!(post_index < vector::length(&registry.posts), 5);
        let p = vector::borrow(&registry.posts, post_index);
        assert!(signer::address_of(account) == p.author, 6);
        let _ = registry;
        let registry_mut = borrow_global_mut<FeedRegistry>(feed_owner);
        if (!table::contains(&registry_mut.deleted, post_index)) {
            table::add(&mut registry_mut.deleted, post_index, true);
        };
    }

    /// Register a comment. Caller must have uploaded the comment blob to Shelby first.
    public entry fun register_comment(
        account: &signer,
        feed_owner: address,
        post_index: u64,
        blob_name: String,
        timestamp: u64,
    ) acquires FeedRegistry {
        let registry = borrow_global<FeedRegistry>(feed_owner);
        assert!(post_index < vector::length(&registry.posts), 2);
        let _ = registry;
        let commenter = signer::address_of(account);
        let registry_mut = borrow_global_mut<FeedRegistry>(feed_owner);
        vector::push_back(&mut registry_mut.comments, Comment {
            post_index,
            commenter,
            blob_name,
            timestamp,
        });
    }

    #[view]
    /// Get number of non-deleted posts.
    public fun get_posts_count(feed_owner: address): u64 acquires FeedRegistry {
        let registry = borrow_global<FeedRegistry>(feed_owner);
        let len = vector::length(&registry.posts);
        let count = 0u64;
        let i = 0u64;
        while (i < len) {
            if (!table::contains(&registry.deleted, i)) {
                count = count + 1
            };
            i = i + 1;
        };
        count
    }

    #[view]
    /// Get the display_index-th non-deleted post. Returns (actual_index, author, blob_name, timestamp).
    public fun get_post(feed_owner: address, display_index: u64): (u64, address, String, u64) acquires FeedRegistry {
        let registry = borrow_global<FeedRegistry>(feed_owner);
        let len = vector::length(&registry.posts);
        let seen = 0u64;
        let i = 0u64;
        while (i < len) {
            if (table::contains(&registry.deleted, i)) {
                i = i + 1;
            } else {
                if (seen == display_index) {
                    let p = vector::borrow(&registry.posts, i);
                    return (i, p.author, p.blob_name, p.timestamp)
                };
                seen = seen + 1;
                i = i + 1;
            }
        };
        abort 7
    }

    #[view]
    /// Get like count for a post.
    public fun get_likes_count(feed_owner: address, post_index: u64): u64 acquires FeedRegistry {
        let registry = borrow_global<FeedRegistry>(feed_owner);
        if (table::contains(&registry.likes, post_index)) {
            vector::length(table::borrow(&registry.likes, post_index))
        } else {
            0
        }
    }

    #[view]
    /// Check if address has liked the post.
    public fun has_liked(feed_owner: address, post_index: u64, addr: address): bool acquires FeedRegistry {
        let registry = borrow_global<FeedRegistry>(feed_owner);
        if (!table::contains(&registry.likes, post_index)) {
            return false
        };
        let likers = table::borrow(&registry.likes, post_index);
        let len = vector::length(likers);
        let i = 0u64;
        while (i < len) {
            if (*vector::borrow(likers, i) == addr) {
                return true
            };
            i = i + 1;
        };
        false
    }

    #[view]
    /// Get comments count for a post.
    public fun get_comments_count_for_post(feed_owner: address, post_index: u64): u64 acquires FeedRegistry {
        let registry = borrow_global<FeedRegistry>(feed_owner);
        let count = 0u64;
        let i = 0u64;
        let n = vector::length(&registry.comments);
        while (i < n) {
            let c = vector::borrow(&registry.comments, i);
            if (c.post_index == post_index) {
                count = count + 1
            };
            i = i + 1;
        };
        count
    }

    #[view]
    /// Get comment at index (global comment index). Returns (post_index, commenter, blob_name, timestamp).
    public fun get_comment(feed_owner: address, index: u64): (u64, address, String, u64) acquires FeedRegistry {
        let registry = borrow_global<FeedRegistry>(feed_owner);
        assert!(index < vector::length(&registry.comments), 4);
        let c = vector::borrow(&registry.comments, index);
        (c.post_index, c.commenter, c.blob_name, c.timestamp)
    }

    #[view]
    /// Get total comments count.
    public fun get_comments_count(feed_owner: address): u64 acquires FeedRegistry {
        vector::length(&borrow_global<FeedRegistry>(feed_owner).comments)
    }
}
