import Wrapper from "@components/Default/Wrapper";
import LoadingIcon from "@static/svg/LoadingIcon";
import { getAvatarFromId } from "@utils/getAvatarFromId";
import { getInfuraURL } from "@utils/getIPFSURL";
import { fetchCollectionsPaginated, fetchUsersPaginated } from "@utils/search";
import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import styled from "styled-components";

const Container = styled.div`
	width: min(72rem, 92vw);
	margin: 0 auto;
`;

const Header = styled.div`
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	margin-bottom: 1.5rem;
`;

const HeaderPill = styled.div`
	display: inline-flex;
	width: fit-content;
	align-items: center;
	gap: 0.45rem;
	padding: 0.4rem 0.75rem;
	border-radius: 9999px;
	background: rgba(var(--app-theme-value), 0.14);
	color: rgb(214, 232, 255);
	font-size: 0.76rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
`;

const TitleText = styled.h1`
	font-size: 2.35rem;
	font-weight: 900;
	line-height: 1.05;
`;

const Underlined = styled.span`
	font-weight: 500;
	text-decoration: underline;
	text-decoration-color: rgba(var(--app-theme-value), 0.5);
`;

const Subtitle = styled.p`
	color: var(--app-container-text-primary-hover);
	font-size: 1rem;
	line-height: 1.6;
	max-width: 48rem;
`;

const ResultsMeta = styled.div`
	color: var(--app-container-text-primary-hover);
	font-size: 0.95rem;
	font-weight: 600;
	margin-bottom: 1rem;
`;

const EmptyState = styled.div`
	display: grid;
	place-items: center;
	min-height: 16rem;
	text-align: center;
	color: var(--app-container-text-primary-hover);
	font-size: 1rem;
	line-height: 1.6;
`;

const Grid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(0, 32rem));
	gap: 1rem;
`;

const CollectionListItem = styled.div`
	position: relative;
	min-height: 11.5rem;
	border-radius: 1.2rem;
	overflow: hidden;
	cursor: pointer;
	background:
		radial-gradient(circle at top right, rgba(var(--app-theme-value), 0.12), transparent 30%),
		linear-gradient(180deg, rgba(18, 23, 40, 0.96) 0%, rgba(9, 11, 19, 1) 100%);
	border: 0.1rem solid rgba(var(--app-theme-value), 0.16);
	transition: transform 0.16s ease, border-color 0.16s ease;
	&:hover {
		transform: translateY(-0.18rem);
		border-color: rgba(var(--app-theme-value), 0.34);
	}
`;

const CollectionImage = styled.img`
	display: ${props => (props.src ? "block" : "none")};
	object-fit: cover;
	height: 100%;
	width: 100%;
	transition: transform 0.12s ease;
	${CollectionListItem}:hover & {
		transform: scale(1.03);
	}
`;

const CollectionTextWrapper = styled.div`
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 1rem 1.1rem;
	background: linear-gradient(
		180deg,
		rgba(4, 5, 10, 0.2) 0%,
		rgba(4, 5, 10, 0.88) 100%
	);
`;

const CollectionText = styled.div`
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
`;

const CollectionName = styled.h2`
	font-size: 1.5rem;
	font-weight: 900;
	color: var(--app-text);
`;

const CollectionDescription = styled.p`
	font-size: 0.98rem;
	font-weight: 500;
	color: var(--app-container-text-primary-hover);
	line-height: 1.45;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
`;

const BadgeRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 0.6rem;
`;

const Badge = styled.span`
	display: inline-flex;
	align-items: center;
	padding: 0.42rem 0.7rem;
	border-radius: 9999px;
	background: rgba(var(--app-theme-value), 0.12);
	border: 0.08rem solid rgba(var(--app-theme-value), 0.18);
	color: rgb(214, 232, 255);
	font-size: 0.76rem;
	font-weight: 700;
`;

const UserListWrapper = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(0, 32rem));
	gap: 0.85rem;
`;

const UserListItem = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 1rem;
	width: 100%;
	padding: 1rem 1.15rem;
	border-radius: 1rem;
	background: var(--app-container-bg-primary);
	border: 0.08rem solid rgba(var(--app-theme-value), 0.14);
	transition: transform 0.12s ease, border-color 0.12s ease;
	cursor: pointer;
	&:hover {
		transform: translateY(-0.12rem);
		border-color: rgba(var(--app-theme-value), 0.28);
	}
	& > img {
		width: 3rem;
		height: 3rem;
		border-radius: 100rem;
	}
`;

const UserText = styled.div`
	flex: 1;
	min-width: 0;
	& > * {
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}
	& > h2 {
		font-size: 1.3rem;
		font-weight: 800;
		color: var(--app-text);
	}
	& > p {
		font-size: 0.92rem;
		font-weight: 500;
		color: var(--app-container-text-primary-hover);
	}
`;

const LoadMoreButton = styled.button`
	width: 100%;
	height: 3rem;
	border-radius: 0.8rem;
	background-image: linear-gradient(
		110deg,
		var(--app-theme-primary) 0%,
		var(--app-theme-secondary) 100%
	);
	color: var(--app-text);
	font-size: 1.05rem;
	font-weight: 800;
	margin-top: 1rem;
	transition: transform 0.12s ease;
	&:hover {
		transform: translateY(-0.08rem);
		cursor: pointer;
	}
`;

const Loader = () => (
	<EmptyState>
		<LoadingIcon size={34} />
	</EmptyState>
);

const ResultsHeader = ({ query, insight, total, type }) => (
	<Header>
		<HeaderPill>Smart Search</HeaderPill>
		<TitleText>
			{type === "users" ? "User" : "Collection"} results for <Underlined>{query}</Underlined>
		</TitleText>
		<Subtitle>
			{insight?.summary ||
				"Searching names, descriptions, creators, and wallet fragments."}
		</Subtitle>
		<ResultsMeta>
			{total} result{total === 1 ? "" : "s"} found
		</ResultsMeta>
	</Header>
);

const CollectionsSearch = () => {
	const { query } = useParams();
	const history = useHistory();
	const [collections, setCollections] = useState([]);
	const [insight, setInsight] = useState(null);
	const [total, setTotal] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [isFinished, setIsFinished] = useState(false);
	const perPage = 8;

	const fetchCollections = async (page, shouldAppend = false) => {
		setIsLoading(true);
		const res = await fetchCollectionsPaginated(query, page, perPage);
		const incomingCollections = res.collections || [];
		setInsight(res.insight || null);
		setTotal(res.total || 0);
		setCollections((current) => {
			const nextCollections = shouldAppend
				? [...current, ...incomingCollections]
				: incomingCollections;
			setIsFinished(nextCollections.length >= (res.total || 0));
			return nextCollections;
		});
		setIsLoading(false);
	};

	useEffect(() => {
		setCollections([]);
		setTotal(0);
		setIsFinished(false);
		fetchCollections(1, false);
		// eslint-disable-next-line
	}, [query]);

	const fetchMore = async () => {
		if (isFinished || isLoading) {
			return;
		}

		const nextPage = Math.floor(collections.length / perPage) + 1;
		await fetchCollections(nextPage, true);
	};

	return (
		<Wrapper>
			<Container>
				<ResultsHeader
					query={query}
					insight={insight}
					total={total}
					type="collections"
				/>
				{isLoading && !collections.length ? (
					<Loader />
				) : collections.length ? (
					<>
						<Grid>
							{collections.map((collection) => (
								<CollectionListItem
									key={collection.id}
									onClick={() => history.push(`/collections/${collection.id}`)}
								>
									<CollectionImage
										src={getInfuraURL(
											collection.thumbnail || collection.thumb || collection.image
										)}
									/>
									<CollectionTextWrapper>
										<CollectionText>
											<CollectionName>{collection.name}</CollectionName>
											<CollectionDescription>
												{collection.description || "Collection match"}
											</CollectionDescription>
										</CollectionText>
										<BadgeRow>
											<Badge>
												{collection.searchMeta?.reason || "Collection match"}
											</Badge>
											{collection.stats ? (
												<Badge>{collection.stats.items || 0} items</Badge>
											) : null}
										</BadgeRow>
									</CollectionTextWrapper>
								</CollectionListItem>
							))}
						</Grid>
						{!isFinished ? (
							!isLoading ? (
								<LoadMoreButton onClick={fetchMore}>Load more matches</LoadMoreButton>
							) : (
								<Loader />
							)
						) : null}
					</>
				) : (
					<EmptyState>
						No matching collections yet. Try a creator name, description keyword, or a
						wallet fragment.
					</EmptyState>
				)}
			</Container>
		</Wrapper>
	);
};

const UsersSearch = () => {
	const { query } = useParams();
	const history = useHistory();
	const [users, setUsers] = useState([]);
	const [insight, setInsight] = useState(null);
	const [total, setTotal] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [isFinished, setIsFinished] = useState(false);
	const perPage = 8;

	const fetchUsers = async (page, shouldAppend = false) => {
		setIsLoading(true);
		const res = await fetchUsersPaginated(query, page, perPage);
		const incomingUsers = res.users || [];
		setInsight(res.insight || null);
		setTotal(res.total || 0);
		setUsers((current) => {
			const nextUsers = shouldAppend ? [...current, ...incomingUsers] : incomingUsers;
			setIsFinished(nextUsers.length >= (res.total || 0));
			return nextUsers;
		});
		setIsLoading(false);
	};

	useEffect(() => {
		setUsers([]);
		setTotal(0);
		setIsFinished(false);
		fetchUsers(1, false);
		// eslint-disable-next-line
	}, [query]);

	const fetchMore = async () => {
		if (isFinished || isLoading) {
			return;
		}

		const nextPage = Math.floor(users.length / perPage) + 1;
		await fetchUsers(nextPage, true);
	};

	return (
		<Wrapper>
			<Container>
				<ResultsHeader query={query} insight={insight} total={total} type="users" />
				{isLoading && !users.length ? (
					<Loader />
				) : users.length ? (
					<>
						<UserListWrapper>
							{users.map((user) => (
								<UserListItem
									key={user.evmAddress}
									onClick={() => history.push(`/profile/${user.evmAddress}`)}
								>
									<img src={getAvatarFromId(user.evmAddress)} alt="user" />
									<UserText>
										<h2>{user.displayName}</h2>
										<p>{user.evmAddress}</p>
									</UserText>
									<Badge>{user.searchMeta?.reason || "User match"}</Badge>
								</UserListItem>
							))}
						</UserListWrapper>
						{!isFinished ? (
							!isLoading ? (
								<LoadMoreButton onClick={fetchMore}>Load more matches</LoadMoreButton>
							) : (
								<Loader />
							)
						) : null}
					</>
				) : (
					<EmptyState>
						No matching users yet. Try a display name or a wallet fragment like 0x212e.
					</EmptyState>
				)}
			</Container>
		</Wrapper>
	);
};

export {
	CollectionsSearch,
	UsersSearch,
	CollectionListItem,
	CollectionImage,
	CollectionTextWrapper,
	CollectionName,
	CollectionDescription,
};
