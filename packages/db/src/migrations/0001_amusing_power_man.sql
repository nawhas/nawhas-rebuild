CREATE INDEX "albums_reciter_id_idx" ON "albums" USING btree ("reciter_id");--> statement-breakpoint
CREATE INDEX "tracks_album_id_idx" ON "tracks" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "lyrics_track_id_idx" ON "lyrics" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("userId");