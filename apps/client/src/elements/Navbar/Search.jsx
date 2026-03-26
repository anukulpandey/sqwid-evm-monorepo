import LoadingIcon from "@static/svg/LoadingIcon";
import SearchIcon from "@static/svg/SearchIcon";
import { getAvatarFromId } from "@utils/getAvatarFromId";
import { getInfuraURL } from "@utils/getIPFSURL";
import { briefSearchAll } from "@utils/search";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import styled from "styled-components";

const QUICK_PROMPTS = ["latest collections", "ben 10 aliens", "0x212e"];

const EMPTY_RESULTS = {
	collections: [],
	users: [],
	totals: {
		collections: 0,
		users: 0,
	},
	insight: null,
};

const SearchContainer = styled.div`
	position: relative;
	& input {
		font-family: var(--font-family);
		font-size: 1rem;
		font-weight: 600;
		padding: 0.8rem 1.25rem;
		padding-left: 2.7rem;
		border-radius: 1000rem;
		background: var(--app-container-bg-primary);
		color: var(--app-text);
		outline: none;
		border: 0.1rem solid transparent;
		max-height: 2.7rem;
		min-width: 18rem;
		transition: border-color 0.16s ease, box-shadow 0.16s ease;
		&::placeholder {
			color: var(--app-container-text-primary);
		}
		&:focus {
			border-color: rgba(var(--app-theme-value), 0.32);
			box-shadow: 0 0 0 0.18rem rgba(var(--app-theme-value), 0.12);
		}
	}
`;

const LogoContainer = styled.div`
	display: grid;
	place-items: center;
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	padding-left: 0.85rem;
	color: var(--app-container-text-primary);
`;

const ResultsContainer = styled.div`
	position: absolute;
	top: calc(100% + 0.7rem);
	left: 0;
	width: min(31rem, 90vw);
	background:
		radial-gradient(circle at top right, rgba(var(--app-theme-value), 0.12), transparent 30%),
		linear-gradient(180deg, rgba(18, 22, 37, 0.98) 0%, rgba(10, 12, 21, 1) 100%);
	border-radius: 1rem;
	border: 0.08rem solid rgba(var(--app-theme-value), 0.2);
	box-shadow:
		0 1.25rem 3rem rgba(0, 0, 0, 0.38),
		inset 0 0 0 0.04rem rgba(255, 255, 255, 0.04);
	margin: 0.5rem 0;
	z-index: 100;
	overflow: hidden;
	padding: 0.7rem 0;
`;

const InsightContainer = styled.div`
	padding: 0.35rem 1rem 0.95rem;
	border-bottom: 0.08rem solid rgba(255, 255, 255, 0.05);
`;

const InsightPill = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	padding: 0.35rem 0.7rem;
	border-radius: 9999px;
	background: rgba(var(--app-theme-value), 0.16);
	color: rgb(216, 233, 255);
	font-size: 0.74rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
`;

const InsightText = styled.p`
	margin: 0.65rem 0 0;
	color: var(--app-container-text-primary-hover);
	font-size: 0.92rem;
	line-height: 1.45;
`;

const PromptContainer = styled.div`
	padding: 0.4rem 1rem 0.25rem;
`;

const PromptTitle = styled.h4`
	margin: 0;
	color: var(--app-text);
	font-size: 1rem;
	font-weight: 800;
`;

const PromptText = styled.p`
	margin: 0.45rem 0 0.8rem;
	color: var(--app-container-text-primary-hover);
	font-size: 0.92rem;
	line-height: 1.45;
`;

const PromptChips = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 0.55rem;
`;

const PromptChip = styled.button`
	font-family: var(--font-family);
	font-size: 0.86rem;
	font-weight: 700;
	padding: 0.55rem 0.8rem;
	border-radius: 9999px;
	border: 0.08rem solid rgba(var(--app-theme-value), 0.22);
	background: rgba(var(--app-theme-value), 0.1);
	color: rgb(214, 231, 255);
	cursor: pointer;
	transition: transform 0.16s ease, background 0.16s ease;
	&:hover {
		transform: translateY(-0.1rem);
		background: rgba(var(--app-theme-value), 0.16);
	}
`;

const CategoryBreakerTitle = styled.span`
	font-size: 0.86rem;
	font-weight: 800;
	color: var(--app-container-text-primary);
	text-transform: uppercase;
	letter-spacing: 0.08em;
`;

const CategoryBreakerContainer = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	padding: 0.85rem 1rem 0.5rem;
	& > a {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--app-container-text-primary);
		text-decoration: none;
		transition: color 0.2s ease;
	}
	& > a:hover {
		color: var(--app-text);
	}
`;

const ResultItem = styled.div`
	padding: 0.7rem 1rem;
	cursor: pointer;
	transition: background 0.12s ease;
	&:hover {
		background: rgba(255, 255, 255, 0.04);
	}
`;

const UserResult = styled.div`
	display: grid;
	grid-template-columns: 2.3rem 1fr;
	gap: 0.8rem;
	align-items: center;
	& > img {
		width: 2.3rem;
		height: 2.3rem;
		border-radius: 1000rem;
	}
`;

const SearchRow = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 0.8rem;
	align-items: center;
`;

const UserResultText = styled.div`
	display: grid;
	gap: 0.1rem;
	min-width: 0;
	& > span {
		font-size: 1rem;
		font-weight: 700;
		color: var(--app-text);
		line-height: 1.15rem;
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
	}
	& > span:nth-child(2) {
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--app-container-text-primary);
	}
`;

const CollectionResult = styled.div`
	display: grid;
	grid-template-columns: 2.8rem 1fr auto;
	gap: 0.85rem;
	align-items: center;
	min-width: 0;
	& > img {
		width: 2.8rem;
		height: 2.8rem;
		object-fit: cover;
		border-radius: 0.8rem;
		background: var(--app-container-bg-secondary);
	}
`;

const CollectionResultText = styled.div`
	display: grid;
	gap: 0.15rem;
	min-width: 0;
	& > span {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
	}
	& > span:first-child {
		color: var(--app-text);
		font-size: 1rem;
		font-weight: 800;
	}
	& > span:last-child {
		color: var(--app-container-text-primary-hover);
		font-size: 0.82rem;
		font-weight: 500;
	}
`;

const MatchReason = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.35rem 0.6rem;
	border-radius: 9999px;
	background: rgba(var(--app-theme-value), 0.11);
	border: 0.08rem solid rgba(var(--app-theme-value), 0.18);
	color: rgb(214, 231, 255);
	font-size: 0.72rem;
	font-weight: 700;
	white-space: nowrap;
`;

const NotFound = styled.div`
	display: grid;
	place-items: center;
	align-content: center;
	height: 100%;
	padding: 1rem;
	font-size: 0.98rem;
	font-weight: 500;
	color: var(--app-container-text-primary);
	text-align: center;
`;

const CategoryBreaker = ({ title, to, count }) => {
	return (
		<CategoryBreakerContainer>
			<CategoryBreakerTitle>{title}{typeof count === "number" ? ` · ${count}` : ""}</CategoryBreakerTitle>
			<Link to={to}>View all</Link>
		</CategoryBreakerContainer>
	);
};

const getResultPath = (result) =>
	result?.evmAddress
		? `/profile/${result.evmAddress}`
		: `/collections/${result.id}`;

const Search = () => {
	const [searchText, setSearchText] = useState("");
	const [selected, setSelected] = useState(false);
	const [results, setResults] = useState(EMPTY_RESULTS);
	const [isLoading, setIsLoading] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const history = useHistory();
	const trimmedSearchText = searchText.trim();
	const shouldSearch =
		trimmedSearchText.length >= 2 || trimmedSearchText.toLowerCase().startsWith("0x");

	useEffect(() => {
		if (!shouldSearch) {
			setResults(EMPTY_RESULTS);
			setIsLoading(false);
			return;
		}

		const delayDebounceFn = setTimeout(() => {
			setIsLoading(true);
			briefSearchAll(trimmedSearchText).then((res) => {
				setResults({
					...EMPTY_RESULTS,
					...res,
				});
				setIsLoading(false);
			});
		}, 280);

		return () => clearTimeout(delayDebounceFn);
	}, [trimmedSearchText, shouldSearch]);

	const topResult = useMemo(() => {
		const bestUser = results.users?.[0];
		const bestCollection = results.collections?.[0];
		if (!bestUser) {
			return bestCollection || null;
		}
		if (!bestCollection) {
			return bestUser || null;
		}
		return (bestUser.searchMeta?.score || 0) >= (bestCollection.searchMeta?.score || 0)
			? bestUser
			: bestCollection;
	}, [results]);

	const closeDropdown = () => {
		setSelected(false);
		setIsHovered(false);
	};

	const navigateTo = (path) => {
		history.push(path);
		closeDropdown();
	};

	const handleSubmit = (e) => {
		if (e.key !== "Enter" || !trimmedSearchText.length) {
			return;
		}

		e.preventDefault();
		if (topResult?.searchMeta?.score >= 115) {
			navigateTo(getResultPath(topResult));
			return;
		}

		navigateTo(`/search/collections/${encodeURIComponent(trimmedSearchText)}`);
	};

	return (
		<SearchContainer>
			<LogoContainer>
				<SearchIcon selected={selected} />
			</LogoContainer>
			<input
				type="text"
				value={searchText}
				onChange={(e) => setSearchText(e.target.value)}
				onKeyDown={handleSubmit}
				onFocus={() => setSelected(true)}
				onBlur={() => setTimeout(() => setSelected(false), 120)}
				placeholder="Search collections, creators, wallets..."
			/>
			{(selected || isHovered) && (
				<ResultsContainer
					onMouseOver={() => setIsHovered(true)}
					onMouseOut={() => setIsHovered(false)}
				>
					{!trimmedSearchText.length ? (
						<PromptContainer>
							<PromptTitle>Smart search</PromptTitle>
							<PromptText>
								Search by collection name, description, creator, or wallet fragment.
							</PromptText>
							<PromptChips>
								{QUICK_PROMPTS.map((prompt) => (
									<PromptChip
										key={prompt}
										onMouseDown={(e) => {
											e.preventDefault();
											setSearchText(prompt);
										}}
									>
										{prompt}
									</PromptChip>
								))}
							</PromptChips>
						</PromptContainer>
					) : isLoading ? (
						<NotFound>
							<LoadingIcon size={28} />
						</NotFound>
					) : (
						<>
							<InsightContainer>
								<InsightPill>Smart Search</InsightPill>
								<InsightText>
									{results.insight?.summary ||
										"Searching names, descriptions, creators, and wallet fragments."}
								</InsightText>
							</InsightContainer>
							{results.users?.length ? (
								<>
									<CategoryBreaker
										title="Users"
										count={results.totals?.users}
										to={`/search/users/${encodeURIComponent(trimmedSearchText)}`}
									/>
									{results.users.map((user) => (
										<ResultItem
											onMouseDown={(e) => {
												e.preventDefault();
												navigateTo(`/profile/${user.evmAddress}`);
											}}
											key={user.evmAddress}
										>
											<SearchRow>
												<UserResult>
													<img alt="User Avatar" src={getAvatarFromId(user.evmAddress)} />
													<UserResultText>
														<span>{user.displayName}</span>
														<span>{user.evmAddress}</span>
													</UserResultText>
												</UserResult>
												<MatchReason>
													{user.searchMeta?.reason || "User match"}
												</MatchReason>
											</SearchRow>
										</ResultItem>
									))}
								</>
							) : null}
							{results.collections?.length ? (
								<>
									<CategoryBreaker
										title="Collections"
										count={results.totals?.collections}
										to={`/search/collections/${encodeURIComponent(trimmedSearchText)}`}
									/>
									{results.collections.map((collection) => (
										<ResultItem
											onMouseDown={(e) => {
												e.preventDefault();
												navigateTo(`/collections/${collection.id}`);
											}}
											key={collection.id}
										>
											<CollectionResult>
												<img
													alt="Collection"
													src={getInfuraURL(
														collection.thumbnail ||
															collection.thumb ||
															collection.image
													)}
												/>
												<CollectionResultText>
													<span>{collection.name}</span>
													<span>
														{collection.description ||
															collection.searchMeta?.reason ||
															"Collection match"}
													</span>
												</CollectionResultText>
												<MatchReason>
													{collection.searchMeta?.reason || "Collection match"}
												</MatchReason>
											</CollectionResult>
										</ResultItem>
									))}
								</>
							) : null}
							{results.collections?.length || results.users?.length ? null : (
								<NotFound>
									No strong matches yet. Try a collection name, creator name, or a wallet
									fragment.
								</NotFound>
							)}
						</>
					)}
				</ResultsContainer>
			)}
		</SearchContainer>
	);
};

export default Search;

export {
	ResultsContainer,
	UserResult,
	UserResultText,
};
