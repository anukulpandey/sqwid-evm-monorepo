import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { respondTo } from "@styles/styledMediaQuery";
import { getInfuraURL } from "@utils/getIPFSURL";
import { numberSeparator } from "@utils/numberSeparator";

const Grid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1.4rem;
	width: 100%;
	${respondTo.md`
		grid-template-columns: 1fr;
	`}
`;

const Card = styled(Link)`
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 13.5rem) minmax(0, 1fr);
	gap: 1rem;
	text-decoration: none;
	border-radius: 1.5rem;
	padding: 0.9rem;
	border: 0.12rem solid rgba(var(--app-theme-value), 0.16);
	background:
		radial-gradient(circle at top right, rgba(var(--app-theme-value), 0.12), transparent 30%),
		linear-gradient(180deg, rgba(19, 24, 42, 0.96) 0%, rgba(9, 12, 22, 1) 100%);
	box-shadow:
		0 1rem 2.5rem rgba(0, 0, 0, 0.32),
		inset 0 0 0 0.06rem rgba(255, 255, 255, 0.03);
	transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
	&::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		box-shadow: inset 0 0 0 0.06rem rgba(255, 255, 255, 0.02);
	}
	&:hover {
		transform: translateY(-0.3rem);
		border-color: rgba(var(--app-theme-value), 0.45);
		box-shadow:
			0 1.4rem 3.2rem rgba(0, 0, 0, 0.4),
			0 0 0 0.08rem rgba(var(--app-theme-value), 0.18);
	}
	${respondTo.md`
		grid-template-columns: 1fr;
	`}
`;

const CoverShell = styled.div`
	position: relative;
	min-height: 15rem;
	border-radius: 1.1rem;
	overflow: hidden;
	background: linear-gradient(
		145deg,
		rgba(32, 43, 72, 0.95) 0%,
		rgba(13, 18, 31, 1) 100%
	);
	border: 0.08rem solid rgba(255, 255, 255, 0.06);
	box-shadow: inset 0 0 0 0.06rem rgba(255, 255, 255, 0.03);
	${respondTo.md`
		min-height: 11rem;
	`}
`;

const Cover = styled.div`
	position: absolute;
	inset: 0;
	background: ${props =>
		props.$src
			? `linear-gradient(180deg, rgba(0, 0, 0, 0.02) 5%, rgba(0, 0, 0, 0.52) 100%), url("${props.$src}") center / cover no-repeat`
			: "linear-gradient(145deg, rgba(var(--app-theme-value), 0.35) 0%, rgba(17, 21, 35, 0.9) 100%)"};
`;

const CoverGlow = styled.div`
	position: absolute;
	inset: auto -15% -25% auto;
	width: 65%;
	height: 45%;
	border-radius: 100%;
	background: rgba(var(--app-theme-value), 0.28);
	filter: blur(2rem);
	opacity: 0.9;
`;

const CoverBadge = styled.div`
	position: absolute;
	top: 0.8rem;
	left: 0.8rem;
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.45rem 0.7rem;
	border-radius: 9999px;
	background: rgba(8, 11, 21, 0.72);
	border: 0.08rem solid rgba(var(--app-theme-value), 0.28);
	color: rgb(218, 234, 255);
	font-size: 0.75rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	backdrop-filter: blur(0.6rem);
`;

const CoverFallback = styled.div`
	position: absolute;
	inset: auto 0 0 0;
	padding: 1rem;
	color: var(--app-text);
	font-size: 1.15rem;
	font-weight: 900;
	line-height: 1.05;
`;

const Content = styled.div`
	display: flex;
	flex: 1;
	flex-direction: column;
	justify-content: space-between;
	padding: 0.35rem 0.3rem 0.35rem 0.1rem;
	gap: 1rem;
	min-width: 0;
`;

const Eyebrow = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	color: var(--app-container-text-primary-hover);
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	&::before {
		content: "";
		display: block;
		width: 1.8rem;
		height: 0.14rem;
		border-radius: 9999px;
		background-image: linear-gradient(
			90deg,
			var(--app-theme-primary) 0%,
			var(--app-theme-secondary) 100%
		);
	}
`;

const Title = styled.h3`
	margin: 0;
	color: var(--app-text);
	font-size: 1.95rem;
	font-weight: 900;
	line-height: 1;
	letter-spacing: -0.03em;
	${respondTo.md`
		font-size: 1.6rem;
	`}
`;

const Description = styled.p`
	margin: 0;
	color: var(--app-container-text-primary-hover);
	font-size: 1rem;
	line-height: 1.5;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
`;

const MetaRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem;
`;

const Stat = styled.div`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	justify-content: center;
	min-width: 5.5rem;
	padding: 0.72rem 0.85rem;
	border-radius: 1rem;
	background: linear-gradient(
		180deg,
		rgba(255, 255, 255, 0.04) 0%,
		rgba(255, 255, 255, 0.02) 100%
	);
	border: 0.08rem solid rgba(255, 255, 255, 0.05);
	color: var(--app-container-text-primary-hover);
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	span {
		color: var(--app-text);
		font-size: 1.3rem;
		font-weight: 900;
		letter-spacing: -0.03em;
	}
`;

const FooterRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	margin-top: auto;
`;

const Creator = styled.div`
	color: var(--app-container-text-primary-hover);
	font-size: 0.88rem;
	font-weight: 600;
	max-width: 60%;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	span {
		color: var(--app-text);
		font-weight: 800;
	}
`;

const Cta = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	color: rgb(208, 229, 255);
	font-size: 0.9rem;
	font-weight: 800;
	letter-spacing: 0.02em;
	&::after {
		content: "↗";
		color: var(--app-theme-primary);
		font-size: 1rem;
	}
`;

const formatNumber = value => {
	try {
		return numberSeparator(Number(value || 0));
	} catch (_error) {
		return "0";
	}
};

const truncateDescription = description => {
	const text = description || "Freshly created collection on the network.";
	return text.length > 120 ? `${text.slice(0, 117)}...` : text;
};

const TopCollectionsSection = ({ items }) => {
	return (
		<Grid>
			{items.map((collection, index) => {
				const src = getInfuraURL(
					collection.thumbnail || collection.thumb || collection.image || ""
				);
				const creatorName =
					collection?.creator?.name || collection?.creator?.address || "Unknown";

				return (
					<Card key={collection.id} to={`/collections/${collection.id}`}>
						<CoverShell>
							<Cover $src={src} />
							<CoverGlow />
							<CoverBadge>#{index + 1} latest</CoverBadge>
							{!src && <CoverFallback>No cover yet</CoverFallback>}
						</CoverShell>
						<Content>
							<div>
								<Eyebrow>Collection Spotlight</Eyebrow>
								<Title>{collection.name || "Untitled Collection"}</Title>
								<Description>
									{truncateDescription(collection.description)}
								</Description>
							</div>
							<MetaRow>
								<Stat>
									Items
									<span>{formatNumber(collection?.stats?.items)}</span>
								</Stat>
								<Stat>
									Sales
									<span>{formatNumber(collection?.stats?.itemsSold)}</span>
								</Stat>
								<Stat>
									Volume
									<span>{formatNumber(collection?.stats?.volume)}</span>
								</Stat>
							</MetaRow>
							<FooterRow>
								<Creator>
									By <span>{creatorName}</span>
								</Creator>
								<Cta>View collection</Cta>
							</FooterRow>
						</Content>
					</Card>
				);
			})}
		</Grid>
	);
};

export default TopCollectionsSection;
