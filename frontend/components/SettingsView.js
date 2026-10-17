'use client';

import { useState } from 'react';
import {
  User, Palette, Bell, Shield, Eye, Sliders, LogOut, Check,
  Moon, Sun, Laptop, AlertTriangle, Trash2, Key, Globe, Volume2,
  Sparkles, CheckCircle2, X, Plus, Smartphone, ShieldCheck
} from 'lucide-react';
import { useTheme } from './ThemeContext';

export default function SettingsView({ user, onUpdateUser, onLogout, showToast }) {
  const [activeTab, setActiveTab] = useState('account');
  const {
    theme,
    darkStyle,
    lightStyle,
    accent,
    fontSize,
    reducedMotion,
    highContrast,
    setTheme,
    setDarkStyle,
    setLightStyle,
    setAccent,
    setFontSize,
    setReducedMotion,
    setHighContrast,
  } = useTheme();

  // Account state
  const [accountForm, setAccountForm] = useState({
    displayName: user?.display_name || '',
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || 'Building things and connecting with curious minds ✨',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notifications state
  const [notifSettings, setNotifSettings] = useState({
    pushEnabled: true,
    likes: true,
    comments: true,
    follows: true,
    messages: true,
    emailWeekly: false,
    emailMarketing: false,
  });

  // Privacy & security state
  const [privacySettings, setPrivacySettings] = useState({
    isPrivate: false,
    readReceipts: true,
    activityStatus: true,
    twoFactor: false,
  });

  const [blockedUsers, setBlockedUsers] = useState(['spammer_bot_9', 'troll_account']);
  const [newBlockedUser, setNewBlockedUser] = useState('');

  // Accessibility & content state
  const [autoplayMedia, setAutoplayMedia] = useState(true);
  const [language, setLanguage] = useState('English (US)');
  const [mutedWords, setMutedWords] = useState(['crypto_giveaway', 'ad_promo']);
  const [newMutedWord, setNewMutedWord] = useState('');

  // Modals state
  const [confirmModal, setConfirmModal] = useState(null); // 'deactivate' | 'delete' | 'about'

  const handleSaveAccount = (e) => {
    e.preventDefault();
    if (accountForm.newPassword) {
      if (accountForm.newPassword !== accountForm.confirmPassword) {
        showToast('New passwords do not match');
        return;
      }
      if (accountForm.newPassword.length < 8) {
        showToast('Password must be at least 8 characters');
        return;
      }
    }

    onUpdateUser?.({
      ...user,
      display_name: accountForm.displayName,
      username: accountForm.username,
      email: accountForm.email,
      bio: accountForm.bio,
    });
    showToast('Account settings updated successfully! ✓');
  };

  const handleAddBlockedUser = (e) => {
    e.preventDefault();
    if (!newBlockedUser.trim()) return;
    if (blockedUsers.includes(newBlockedUser.trim())) {
      showToast('User already in blocked list');
      return;
    }
    setBlockedUsers([...blockedUsers, newBlockedUser.trim()]);
    setNewBlockedUser('');
    showToast(`Blocked @${newBlockedUser.trim()}`);
  };

  const handleUnblock = (userToUnblock) => {
    setBlockedUsers(blockedUsers.filter((u) => u !== userToUnblock));
    showToast(`Unblocked @${userToUnblock}`);
  };

  const handleAddMutedWord = (e) => {
    e.preventDefault();
    if (!newMutedWord.trim()) return;
    const word = newMutedWord.trim().toLowerCase();
    if (mutedWords.includes(word)) return;
    setMutedWords([...mutedWords, word]);
    setNewMutedWord('');
    showToast(`Muted "${word}"`);
  };

  const handleRemoveMutedWord = (word) => {
    setMutedWords(mutedWords.filter((w) => w !== word));
    showToast(`Unmuted "${word}"`);
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'accessibility', label: 'Accessibility', icon: Eye },
    { id: 'content', label: 'Content & App', icon: Sliders },
  ];

  return (
    <div className="settings-page">
      <div className="settings-sidebar card-surface">
        <div className="settings-sidebar-header">
          <h3>Settings</h3>
          <p>Manage your account, appearance and experience.</p>
        </div>

        <nav className="settings-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`settings-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="settings-sidebar-footer">
          <button className="settings-logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            <span>Sign out of ConnectHub</span>
          </button>
        </div>
      </div>

      <div className="settings-content-panel card-surface">
        {/* ================= ACCOUNT TAB ================= */}
        {activeTab === 'account' && (
          <div className="settings-section">
            <div className="settings-section-head">
              <h2>Account Settings</h2>
              <p>Update your profile information and credentials.</p>
            </div>

            <form onSubmit={handleSaveAccount} className="settings-form">
              <div className="form-group-row">
                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={accountForm.displayName}
                    onChange={(e) => setAccountForm({ ...accountForm, displayName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <div className="input-prefix-wrap">
                    <span className="input-prefix">@</span>
                    <input
                      type="text"
                      value={accountForm.username}
                      onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  rows={3}
                  value={accountForm.bio}
                  onChange={(e) => setAccountForm({ ...accountForm, bio: e.target.value })}
                  maxLength={160}
                />
                <span className="form-help-text">{accountForm.bio.length}/160 characters</span>
              </div>

              <div className="settings-subdivider" />
              <h3>Password & Security</h3>

              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={accountForm.currentPassword}
                  onChange={(e) => setAccountForm({ ...accountForm, currentPassword: e.target.value })}
                />
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    placeholder="At least 8 characters"
                    value={accountForm.newPassword}
                    onChange={(e) => setAccountForm({ ...accountForm, newPassword: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={accountForm.confirmPassword}
                    onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-submit-row">
                <button type="submit" className="primary-btn">
                  <Check size={16} /> Save Changes
                </button>
              </div>
            </form>

            <div className="settings-subdivider danger-divider" />
            <div className="danger-zone">
              <h3>Danger Zone</h3>
              <p>Actions that temporarily suspend or permanently erase your profile.</p>

              <div className="danger-zone-actions">
                <div className="danger-item">
                  <div>
                    <b>Deactivate Account</b>
                    <p>Temporarily hide your profile, posts, and comments until you sign in again.</p>
                  </div>
                  <button
                    type="button"
                    className="outline-btn danger-outline"
                    onClick={() => setConfirmModal('deactivate')}
                  >
                    Deactivate
                  </button>
                </div>

                <div className="danger-item">
                  <div>
                    <b>Delete Account</b>
                    <p>Permanently remove your account and all associated content. This cannot be undone.</p>
                  </div>
                  <button
                    type="button"
                    className="primary-btn danger-btn"
                    onClick={() => setConfirmModal('delete')}
                  >
                    <Trash2 size={15} /> Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= APPEARANCE TAB ================= */}
        {activeTab === 'appearance' && (
          <div className="settings-section">
            <div className="settings-section-head">
              <h2>Appearance & Themes</h2>
              <p>Customize the look and feel of ConnectHub with Twitter and Instagram styles.</p>
            </div>

            <div className="settings-card-group">
              <label className="group-label">Theme Mode</label>
              <div className="theme-options-grid">
                <button
                  type="button"
                  className={`theme-card ${theme === 'light' ? 'selected' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <div className="theme-preview light-preview">
                    <div className="preview-topbar" />
                    <div className="preview-content">
                      <div className="preview-line w-80" />
                      <div className="preview-line w-60" />
                    </div>
                  </div>
                  <div className="theme-card-info">
                    <Sun size={18} />
                    <b>Light Mode</b>
                    <span>Clean & crisp white surfaces</span>
                  </div>
                  {theme === 'light' && <CheckCircle2 size={16} className="selected-check" />}
                </button>

                <button
                  type="button"
                  className={`theme-card ${theme === 'dark' ? 'selected' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <div className="theme-preview dark-preview">
                    <div className="preview-topbar" />
                    <div className="preview-content">
                      <div className="preview-line w-80" />
                      <div className="preview-line w-60" />
                    </div>
                  </div>
                  <div className="theme-card-info">
                    <Moon size={18} />
                    <b>Dark Mode</b>
                    <span>Immersive dark surfaces</span>
                  </div>
                  {theme === 'dark' && <CheckCircle2 size={16} className="selected-check" />}
                </button>

                <button
                  type="button"
                  className={`theme-card ${theme === 'system' ? 'selected' : ''}`}
                  onClick={() => setTheme('system')}
                >
                  <div className="theme-preview system-preview">
                    <div className="preview-half-light" />
                    <div className="preview-half-dark" />
                  </div>
                  <div className="theme-card-info">
                    <Laptop size={18} />
                    <b>System Default</b>
                    <span>Match OS preference</span>
                  </div>
                  {theme === 'system' && <CheckCircle2 size={16} className="selected-check" />}
                </button>
              </div>

              {theme === 'dark' && (
                <>
                  <label className="group-label" style={{ marginTop: '24px' }}>Dark Mode Aesthetic</label>
                  <div className="dark-flavor-grid">
                    <button
                      type="button"
                      className={`flavor-btn ${darkStyle === 'twitter' ? 'active' : ''}`}
                      onClick={() => setDarkStyle('twitter')}
                    >
                      <div className="flavor-chip twitter-chip" />
                      <div>
                        <b>Twitter Lights Out</b>
                        <small>Pitch black (#000000) with ultra-high contrast</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`flavor-btn ${darkStyle === 'instagram' ? 'active' : ''}`}
                      onClick={() => setDarkStyle('instagram')}
                    >
                      <div className="flavor-chip instagram-chip" />
                      <div>
                        <b>Instagram Dark</b>
                        <small>Refined midnight slate (#121212)</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`flavor-btn ${darkStyle === 'navy' ? 'active' : ''}`}
                      onClick={() => setDarkStyle('navy')}
                    >
                      <div className="flavor-chip navy-chip" />
                      <div>
                        <b>ConnectHub Navy</b>
                        <small>Deep twilight blue-black (#0a0e1a)</small>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {theme === 'light' && (
                <>
                  <label className="group-label" style={{ marginTop: '24px' }}>Light Mode Aesthetic (Soft on the eyes)</label>
                  <div className="dark-flavor-grid">
                    <button
                      type="button"
                      className={`flavor-btn ${lightStyle === 'soft' ? 'active' : ''}`}
                      onClick={() => setLightStyle('soft')}
                    >
                      <div className="flavor-chip soft-chip" />
                      <div>
                        <b>Soft Cool Slate</b>
                        <small>Gentle mist tint (#f1f4f8) · Zero harsh glare</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`flavor-btn ${lightStyle === 'warm' ? 'active' : ''}`}
                      onClick={() => setLightStyle('warm')}
                    >
                      <div className="flavor-chip warm-chip" />
                      <div>
                        <b>Warm Sand / Ivory</b>
                        <small>Cozy paper tone (#f7f4ed) · Natural comfort</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`flavor-btn ${lightStyle === 'sky' ? 'active' : ''}`}
                      onClick={() => setLightStyle('sky')}
                    >
                      <div className="flavor-chip sky-chip" />
                      <div>
                        <b>Azure Breeze</b>
                        <small>Twitter soft sky tint (#edf3f9)</small>
                      </div>
                    </button>
                  </div>
                </>
              )}

              <label className="group-label" style={{ marginTop: '24px' }}>Accent Color</label>
              <div className="accent-picker-row">
                {[
                  { id: 'blue', label: 'Twitter Blue', color: '#1d9bf0' },
                  { id: 'pink', label: 'Insta Berry', color: '#e1306c' },
                  { id: 'purple', label: 'Electric Purple', color: '#8b5cf6' },
                  { id: 'mint', label: 'Emerald Mint', color: '#10b981' },
                  { id: 'orange', label: 'Sunset Amber', color: '#f59e0b' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`accent-dot ${accent === item.id ? 'active' : ''}`}
                    style={{ backgroundColor: item.color }}
                    onClick={() => {
                      setAccent(item.id);
                      showToast(`Accent color set to ${item.label}`);
                    }}
                    title={item.label}
                  >
                    {accent === item.id && <Check size={14} color="#fff" />}
                  </button>
                ))}
              </div>

              <label className="group-label" style={{ marginTop: '24px' }}>Font Sizing</label>
              <div className="font-size-options">
                {[
                  { id: 'small', label: 'Compact' },
                  { id: 'medium', label: 'Standard' },
                  { id: 'large', label: 'Comfortable' },
                ].map((fs) => (
                  <button
                    key={fs.id}
                    type="button"
                    className={`font-size-btn ${fontSize === fs.id ? 'active' : ''}`}
                    onClick={() => setFontSize(fs.id)}
                  >
                    {fs.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= NOTIFICATIONS TAB ================= */}
        {activeTab === 'notifications' && (
          <div className="settings-section">
            <div className="settings-section-head">
              <h2>Notification Preferences</h2>
              <p>Control what notifications you receive and how.</p>
            </div>

            <div className="settings-toggle-list">
              <div className="toggle-item">
                <div className="toggle-text">
                  <b>Push Notifications</b>
                  <p>Receive notifications on your device in real-time.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notifSettings.pushEnabled}
                    onChange={(e) => setNotifSettings({ ...notifSettings, pushEnabled: e.target.checked })}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-text">
                  <b>Likes & Reactions</b>
                  <p>Notify when someone likes your posts or stories.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notifSettings.likes}
                    onChange={(e) => setNotifSettings({ ...notifSettings, likes: e.target.checked })}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-text">
                  <b>Comments & Replies</b>
                  <p>Notify when someone replies to your post or comment.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notifSettings.comments}
                    onChange={(e) => setNotifSettings({ ...notifSettings, comments: e.target.checked })}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-text">
                  <b>New Followers</b>
                  <p>Notify when someone follows your account.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notifSettings.follows}
                    onChange={(e) => setNotifSettings({ ...notifSettings, follows: e.target.checked })}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-text">
                  <b>Direct Messages</b>
                  <p>Notify when you receive a new direct message.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notifSettings.messages}
                    onChange={(e) => setNotifSettings({ ...notifSettings, messages: e.target.checked })}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="settings-subdivider" />
              <h3>Email Digests</h3>

              <div className="toggle-item">
                <div className="toggle-text">
                  <b>Weekly Highlights</b>
                  <p>A weekly email summarizing top posts and community highlights.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notifSettings.emailWeekly}
                    onChange={(e) => setNotifSettings({ ...notifSettings, emailWeekly: e.target.checked })}
                  />
                  <span className="slider round" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ================= PRIVACY & SECURITY TAB ================= */}
        {activeTab === 'privacy' && (
          <div className="settings-section">
            <div className="settings-section-head">
              <h2>Privacy & Security</h2>
              <p>Manage visibility, active sessions, and blocked accounts.</p>
            </div>

            <div className="settings-toggle-list">
              <div className="toggle-item">
                <div className="toggle-text">
                  <b>Private Account</b>
                  <p>When private, only people you approve can see your posts and stories.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={privacySettings.isPrivate}
                    onChange={(e) => {
                      setPrivacySettings({ ...privacySettings, isPrivate: e.target.checked });
                      showToast(e.target.checked ? 'Account set to Private' : 'Account is now Public');
                    }}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-text">
                  <b>Read Receipts</b>
                  <p>Let others see when you have viewed their direct messages.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={privacySettings.readReceipts}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, readReceipts: e.target.checked })}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-text">
                  <b>Two-Factor Authentication (2FA)</b>
                  <p>Require an authentication code when signing in on a new device.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={privacySettings.twoFactor}
                    onChange={(e) => {
                      setPrivacySettings({ ...privacySettings, twoFactor: e.target.checked });
                      showToast(e.target.checked ? 'Two-Factor Authentication enabled' : 'Two-Factor Authentication disabled');
                    }}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="settings-subdivider" />
              <h3>Blocked Accounts</h3>
              <p className="section-note">Blocked users cannot see your posts or message you.</p>

              <form onSubmit={handleAddBlockedUser} className="inline-add-form">
                <input
                  type="text"
                  placeholder="Enter username to block..."
                  value={newBlockedUser}
                  onChange={(e) => setNewBlockedUser(e.target.value)}
                />
                <button type="submit" className="outline-btn">
                  Block
                </button>
              </form>

              <div className="pill-list">
                {blockedUsers.map((u) => (
                  <div key={u} className="user-pill">
                    <span>@{u}</span>
                    <button type="button" onClick={() => handleUnblock(u)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {blockedUsers.length === 0 && <span className="muted-text">No blocked accounts.</span>}
              </div>

              <div className="settings-subdivider" />
              <h3>Active Sessions</h3>
              <div className="sessions-list">
                <div className="session-card current-session">
                  <Smartphone size={20} className="session-icon" />
                  <div className="session-info">
                    <b>Chrome on Windows (Current Session)</b>
                    <small>Active now · IP: 192.168.1.1</small>
                  </div>
                  <span className="badge-active">This Device</span>
                </div>

                <div className="session-card">
                  <Smartphone size={20} className="session-icon" />
                  <div className="session-info">
                    <b>ConnectHub Mobile on iOS</b>
                    <small>Last active 3 hours ago · Mumbai, India</small>
                  </div>
                  <button
                    type="button"
                    className="text-btn danger-text"
                    onClick={() => showToast('Revoked mobile session')}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= ACCESSIBILITY TAB ================= */}
        {activeTab === 'accessibility' && (
          <div className="settings-section">
            <div className="settings-section-head">
              <h2>Accessibility</h2>
              <p>Configure display settings for easier viewing and motion comfort.</p>
            </div>

            <div className="settings-toggle-list">
              <div className="toggle-item">
                <div className="toggle-text">
                  <b>Reduce Motion</b>
                  <p>Minimizes animations, transitions, and story progress effects.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-text">
                  <b>High Contrast</b>
                  <p>Increases border definition and contrast between text and surfaces.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-text">
                  <b>Autoplay Media</b>
                  <p>Automatically play video posts when they enter the screen.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={autoplayMedia}
                    onChange={(e) => {
                      setAutoplayMedia(e.target.checked);
                      showToast(`Autoplay ${e.target.checked ? 'enabled' : 'disabled'}`);
                    }}
                  />
                  <span className="slider round" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ================= CONTENT & APP TAB ================= */}
        {activeTab === 'content' && (
          <div className="settings-section">
            <div className="settings-section-head">
              <h2>Content & Application</h2>
              <p>Mute words, manage feed languages, and learn about ConnectHub.</p>
            </div>

            <div className="form-group">
              <label>Default Language</label>
              <select
                className="select-input"
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  showToast(`Language set to ${e.target.value}`);
                }}
              >
                <option value="English (US)">English (US)</option>
                <option value="Español">Español</option>
                <option value="Français">Français</option>
                <option value="Deutsch">Deutsch</option>
                <option value="Hindi">हिन्दी (Hindi)</option>
                <option value="Japanese">日本語 (Japanese)</option>
              </select>
            </div>

            <div className="settings-subdivider" />
            <h3>Muted Words & Hashtags</h3>
            <p className="section-note">Posts containing these keywords will be hidden from your feed.</p>

            <form onSubmit={handleAddMutedWord} className="inline-add-form">
              <input
                type="text"
                placeholder="Enter word or #tag to mute..."
                value={newMutedWord}
                onChange={(e) => setNewMutedWord(e.target.value)}
              />
              <button type="submit" className="outline-btn">
                <Plus size={14} /> Add
              </button>
            </form>

            <div className="pill-list">
              {mutedWords.map((word) => (
                <div key={word} className="user-pill">
                  <span>{word}</span>
                  <button type="button" onClick={() => handleRemoveMutedWord(word)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="settings-subdivider" />
            <h3>Help & Support</h3>

            <div className="info-actions-list">
              <button
                type="button"
                className="outline-btn w-full justify-between"
                onClick={() => setConfirmModal('about')}
              >
                <span>About ConnectHub</span>
                <Sparkles size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-card small-modal" onClick={(e) => e.stopPropagation()}>
            {confirmModal === 'deactivate' && (
              <>
                <div className="modal-header">
                  <div className="modal-title">
                    <AlertTriangle size={20} className="warning-text" />
                    <h3>Deactivate Account?</h3>
                  </div>
                  <button className="icon-btn" onClick={() => setConfirmModal(null)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="modal-body-text">
                  Your profile and content will be hidden from others until you log back in. Are you sure you want to proceed?
                </div>
                <div className="modal-actions">
                  <button className="secondary-btn" onClick={() => setConfirmModal(null)}>Cancel</button>
                  <button
                    className="primary-btn danger-btn"
                    onClick={() => {
                      setConfirmModal(null);
                      showToast('Account deactivated.');
                      onLogout();
                    }}
                  >
                    Deactivate
                  </button>
                </div>
              </>
            )}

            {confirmModal === 'delete' && (
              <>
                <div className="modal-header">
                  <div className="modal-title">
                    <Trash2 size={20} className="danger-text" />
                    <h3>Permanently Delete Account?</h3>
                  </div>
                  <button className="icon-btn" onClick={() => setConfirmModal(null)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="modal-body-text">
                  This action is permanent and cannot be reversed. All your posts, photos, bookmarks, and chat history will be deleted.
                </div>
                <div className="modal-actions">
                  <button className="secondary-btn" onClick={() => setConfirmModal(null)}>Cancel</button>
                  <button
                    className="primary-btn danger-btn"
                    onClick={() => {
                      setConfirmModal(null);
                      showToast('Account deleted.');
                      onLogout();
                    }}
                  >
                    Confirm Permanent Delete
                  </button>
                </div>
              </>
            )}

            {confirmModal === 'about' && (
              <>
                <div className="modal-header">
                  <div className="modal-title">
                    <Sparkles size={20} className="icon-accent" />
                    <h3>About ConnectHub</h3>
                  </div>
                  <button className="icon-btn" onClick={() => setConfirmModal(null)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="modal-body-text">
                  <p><strong>ConnectHub v2.0</strong> — The premier hybrid social experience blending the speed and ideas of Twitter with the vibrant visual stories of Instagram.</p>
                  <p>Built with Next.js 14, React 18, and FastAPI with complete responsive support across mobile, tablet, and desktop.</p>
                </div>
                <div className="modal-actions">
                  <button className="primary-btn" onClick={() => setConfirmModal(null)}>
                    Got it!
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
