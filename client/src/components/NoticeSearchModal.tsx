import { X, Search } from "lucide-react";
import { useState } from "react";

interface Notice {
  id: number;
  title: string;
  titleJa: string;
  category: string;
  author: string;
  date: string;
  views: number;
  comments: number;
  content?: string;
  contentJa: string;
}

interface NoticeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notices: Notice[];
  onSearch: (results: Notice[]) => void;
}

type SearchType = "title" | "content" | "titleAndContent" | "author";

export default function NoticeSearchModal({
  isOpen,
  onClose,
  notices,
  onSearch,
}: NoticeSearchModalProps) {
  const [searchType, setSearchType] = useState<SearchType>("title");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      onSearch(notices);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = notices.filter((notice) => {
      switch (searchType) {
        case "title":
          return notice.titleJa.toLowerCase().includes(query);
        case "content":
          return notice.contentJa.toLowerCase().includes(query);
        case "titleAndContent":
          return (
            notice.titleJa.toLowerCase().includes(query) ||
            notice.contentJa.toLowerCase().includes(query)
          );
        case "author":
          return notice.author.toLowerCase().includes(query);
        default:
          return false;
      }
    });

    onSearch(results);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-8 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">検索</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Type Dropdown */}
        <div className="mb-4">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as SearchType)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900 cursor-pointer"
          >
            <option value="title">題目</option>
            <option value="content">内容</option>
            <option value="titleAndContent">題目+内容</option>
            <option value="author">作成者</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="検索語を入力してください"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-12"
            autoFocus
          />
          <button
            onClick={handleSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary hover:text-primary/80"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSearch}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            検索
          </button>
        </div>
      </div>
    </div>
  );
}
