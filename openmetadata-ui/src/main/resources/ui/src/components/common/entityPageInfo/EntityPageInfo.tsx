/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { faExclamationCircle, faStar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Popover, Space, Tooltip } from 'antd';
import classNames from 'classnames';
import { cloneDeep, isEmpty, isUndefined } from 'lodash';
import { EntityFieldThreads, EntityTags, ExtraInfo, TagOption } from 'Models';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { FQN_SEPARATOR_CHAR } from '../../../constants/char.constants';
import { FOLLOWERS_VIEW_CAP } from '../../../constants/constants';
import { SettledStatus } from '../../../enums/axios.enum';
import { EntityType } from '../../../enums/entity.enum';
import { Table } from '../../../generated/entity/data/table';
import { ThreadType } from '../../../generated/entity/feed/thread';
import { Operation } from '../../../generated/entity/policies/accessControl/rule';
import { EntityReference } from '../../../generated/type/entityReference';
import { LabelType, State, TagLabel } from '../../../generated/type/tagLabel';
import { useAfterMount } from '../../../hooks/useAfterMount';
import { getHtmlForNonAdminAction } from '../../../utils/CommonUtils';
import { getEntityFeedLink } from '../../../utils/EntityUtils';
import {
  fetchGlossaryTerms,
  getGlossaryTermlist,
} from '../../../utils/GlossaryUtils';
import SVGIcons, { Icons } from '../../../utils/SvgUtils';
import { getTagCategories, getTaglist } from '../../../utils/TagsUtils';
import {
  getRequestTagsPath,
  getUpdateTagsPath,
  TASK_ENTITIES,
} from '../../../utils/TasksUtils';
import TagsContainer from '../../tags-container/tags-container';
import TagsViewer from '../../tags-viewer/tags-viewer';
import Tags from '../../tags/tags';
import EntitySummaryDetails from '../EntitySummaryDetails/EntitySummaryDetails';
import NonAdminAction from '../non-admin-action/NonAdminAction';
import ProfilePicture from '../ProfilePicture/ProfilePicture';
import TitleBreadcrumb from '../title-breadcrumb/title-breadcrumb.component';
import { TitleBreadcrumbProps } from '../title-breadcrumb/title-breadcrumb.interface';
import FollowersModal from './FollowersModal';
import ManageButton from './ManageButton/ManageButton';

interface Props {
  titleLinks: TitleBreadcrumbProps['titleLinks'];
  isFollowing?: boolean;
  deleted?: boolean;
  followers?: number;
  extraInfo: Array<ExtraInfo>;
  tier: TagLabel;
  tags: Array<EntityTags>;
  isTagEditable?: boolean;
  owner?: EntityReference;
  hasEditAccess?: boolean;
  followersList: Array<EntityReference>;
  entityName: string;
  entityId?: string;
  entityType?: string;
  entityFqn?: string;
  version?: string;
  isVersionSelected?: boolean;
  entityFieldThreads?: EntityFieldThreads[];
  entityFieldTasks?: EntityFieldThreads[];
  onThreadLinkSelect?: (value: string, threadType?: ThreadType) => void;
  followHandler?: () => void;
  tagsHandler?: (selectedTags?: Array<EntityTags>) => void;
  versionHandler?: () => void;
  updateOwner?: (value: Table['owner']) => void;
  updateTier?: (value: string) => void;
}

const EntityPageInfo = ({
  titleLinks,
  isFollowing,
  deleted = false,
  followHandler,
  followers,
  extraInfo,
  tier,
  tags,
  isTagEditable = false,
  owner,
  hasEditAccess,
  tagsHandler,
  followersList = [],
  entityName,
  entityId,
  version,
  isVersionSelected,
  versionHandler,
  entityFieldThreads,
  onThreadLinkSelect,
  entityFqn,
  entityType,
  updateOwner,
  updateTier,
  entityFieldTasks,
}: Props) => {
  const history = useHistory();
  const tagThread = entityFieldThreads?.[0];
  const tagTask = entityFieldTasks?.[0];
  const [isEditable, setIsEditable] = useState<boolean>(false);
  const [entityFollowers, setEntityFollowers] =
    useState<Array<EntityReference>>(followersList);
  const [isViewMore, setIsViewMore] = useState<boolean>(false);
  const [tagList, setTagList] = useState<Array<TagOption>>([]);
  const [tagFetchFailed, setTagFetchFailed] = useState<boolean>(false);
  const [isTagLoading, setIsTagLoading] = useState<boolean>(false);
  const [versionFollowButtonWidth, setVersionFollowButtonWidth] = useState(
    document.getElementById('version-and-follow-section')?.offsetWidth
  );

  const handleRequestTags = () => {
    history.push(getRequestTagsPath(entityType as string, entityFqn as string));
  };
  const handleUpdateTags = () => {
    history.push(getUpdateTagsPath(entityType as string, entityFqn as string));
  };

  const handleTagSelection = (selectedTags?: Array<EntityTags>) => {
    if (selectedTags) {
      const prevTags =
        tags?.filter((tag) =>
          selectedTags
            .map((selTag) => selTag.tagFQN)
            .includes(tag?.tagFQN as string)
        ) || [];
      const newTags = selectedTags
        .filter((tag) => {
          return !prevTags
            ?.map((prevTag) => prevTag.tagFQN)
            .includes(tag.tagFQN);
        })
        .map((tag) => ({
          labelType: LabelType.Manual,
          state: State.Confirmed,
          source: tag.source,
          tagFQN: tag.tagFQN,
        }));
      tagsHandler?.([...prevTags, ...newTags]);
    }
    setIsEditable(false);
  };

  const getSelectedTags = () => {
    return tier?.tagFQN
      ? [
          ...tags.map((tag) => ({
            ...tag,
            isRemovable: true,
          })),
          { tagFQN: tier.tagFQN, isRemovable: false },
        ]
      : [
          ...tags.map((tag) => ({
            ...tag,
            isRemovable: true,
          })),
        ];
  };

  const getFollowers = () => {
    const list = cloneDeep(entityFollowers);

    return (
      <div
        className={classNames('tw-max-h-96 tw-overflow-y-auto', {
          'tw-flex tw-justify-center tw-items-center tw-py-2':
            list.length === 0,
        })}>
        {list.length > 0 ? (
          <div
            className={classNames('tw-grid tw-gap-3', {
              'tw-grid-cols-2': list.length > 1,
            })}>
            {list.slice(0, FOLLOWERS_VIEW_CAP).map((follower, index) => (
              <div className="tw-flex" key={index}>
                <ProfilePicture
                  displayName={follower?.displayName || follower?.name}
                  id={follower?.id || ''}
                  name={follower?.name || ''}
                  width="20"
                />
                <span className="tw-self-center tw-ml-2">
                  {follower?.displayName || follower?.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p>{entityName} doesn&#39;t have any followers yet</p>
        )}
        {list.length > FOLLOWERS_VIEW_CAP && (
          <p
            className="link-text tw-text-sm tw-py-2"
            onClick={() => setIsViewMore(true)}>
            View more
          </p>
        )}
      </div>
    );
  };

  const getVersionButton = (version: string) => {
    return (
      <Button
        className={classNames(
          'tw-border tw-border-primary tw-rounded',
          !isUndefined(isVersionSelected) ? 'tw-text-white' : 'tw-text-primary'
        )}
        data-testid="version-button"
        size="small"
        type={!isUndefined(isVersionSelected) ? 'primary' : 'default'}
        onClick={versionHandler}>
        <Space>
          <span>
            <SVGIcons
              alt="version icon"
              icon={isVersionSelected ? 'icon-version-white' : 'icon-version'}
            />
            <span>Versions</span>
          </span>
          <span
            className={classNames(
              'tw-border-l tw-font-medium tw-cursor-pointer hover:tw-underline tw-pl-1',
              { 'tw-border-primary': isUndefined(isVersionSelected) }
            )}
            data-testid="version-value">
            {parseFloat(version).toFixed(1)}
          </span>
        </Space>
      </Button>
    );
  };

  const fetchTagsAndGlossaryTerms = () => {
    setIsTagLoading(true);
    Promise.allSettled([getTagCategories(), fetchGlossaryTerms()])
      .then((values) => {
        let tagsAndTerms: TagOption[] = [];
        if (
          values[0].status === SettledStatus.FULFILLED &&
          values[0].value.data
        ) {
          tagsAndTerms = getTaglist(values[0].value.data).map((tag) => {
            return { fqn: tag, source: 'Tag' };
          });
        }
        if (
          values[1].status === SettledStatus.FULFILLED &&
          values[1].value &&
          values[1].value.length > 0
        ) {
          const glossaryTerms: TagOption[] = getGlossaryTermlist(
            values[1].value
          ).map((tag) => {
            return { fqn: tag, source: 'Glossary' };
          });
          tagsAndTerms = [...tagsAndTerms, ...glossaryTerms];
        }
        setTagList(tagsAndTerms);
        if (
          values[0].status === SettledStatus.FULFILLED &&
          values[1].status === SettledStatus.FULFILLED
        ) {
          setTagFetchFailed(false);
        } else {
          setTagFetchFailed(true);
        }
      })
      .catch(() => {
        setTagList([]);
        setTagFetchFailed(true);
      })
      .finally(() => {
        setIsTagLoading(false);
      });
  };

  const getThreadElements = () => {
    if (!isUndefined(entityFieldThreads)) {
      return !isUndefined(tagThread) &&
        TASK_ENTITIES.includes(entityType as EntityType) ? (
        <button
          className="tw-w-8 tw-h-8 tw-mr-1 tw-flex-none link-text focus:tw-outline-none"
          data-testid="tag-thread"
          onClick={() => onThreadLinkSelect?.(tagThread.entityLink)}>
          <span className="tw-flex">
            <SVGIcons alt="comments" icon={Icons.COMMENT} />
            <span className="tw-ml-1" data-testid="tag-thread-count">
              {tagThread.count}
            </span>
          </span>
        </button>
      ) : (
        <button
          className="tw-w-8 tw-h-8 tw-mr-1 tw-flex-none link-text focus:tw-outline-none tw-align-top"
          data-testid="start-tag-thread"
          onClick={() =>
            onThreadLinkSelect?.(
              getEntityFeedLink(entityType, entityFqn, 'tags')
            )
          }>
          <SVGIcons alt="comments" icon={Icons.COMMENT_PLUS} />
        </button>
      );
    } else {
      return null;
    }
  };

  const getRequestTagsElements = useCallback(() => {
    const hasTags = !isEmpty(tags);
    const text = hasTags ? 'Update request tags' : 'Request tags';

    return onThreadLinkSelect ? (
      <button
        className="tw-w-8 tw-h-8 tw-mr-1 tw-flex-none link-text focus:tw-outline-none tw-align-top"
        data-testid="request-description"
        onClick={hasTags ? handleUpdateTags : handleRequestTags}>
        <Popover
          destroyTooltipOnHide
          content={text}
          overlayClassName="ant-popover-request-description"
          trigger="hover"
          zIndex={9999}>
          <SVGIcons alt="request-tags" icon={Icons.REQUEST} />
        </Popover>
      </button>
    ) : null;
  }, [tags]);

  const getTaskElement = useCallback(() => {
    return !isUndefined(tagTask) ? (
      <button
        className="tw-w-8 tw-h-8 tw-mr-1 tw-flex-none link-text focus:tw-outline-none"
        data-testid="tag-task"
        onClick={() =>
          onThreadLinkSelect?.(tagTask.entityLink, ThreadType.Task)
        }>
        <span className="tw-flex">
          <SVGIcons alt="comments" icon={Icons.TASK_ICON} width="16px" />
          <span className="tw-ml-1" data-testid="tag-task-count">
            {tagTask.count}
          </span>
        </span>
      </button>
    ) : null;
  }, [tagTask]);

  useEffect(() => {
    setEntityFollowers(followersList);
  }, [followersList]);

  useAfterMount(() => {
    setVersionFollowButtonWidth(
      document.getElementById('version-and-follow-section')?.offsetWidth
    );
  });

  return (
    <div data-testid="entity-page-info">
      <Space
        align="start"
        className="tw-justify-between"
        style={{ width: '100%' }}>
        <Space align="center">
          <TitleBreadcrumb
            titleLinks={titleLinks}
            widthDeductions={
              (versionFollowButtonWidth ? versionFollowButtonWidth : 0) + 30
            }
          />
          {deleted && (
            <>
              <div
                className="tw-rounded tw-bg-error-lite tw-text-error tw-font-medium tw-h-6 tw-px-2 tw-py-0.5 tw-ml-2"
                data-testid="deleted-badge">
                <FontAwesomeIcon
                  className="tw-mr-1"
                  icon={faExclamationCircle}
                />
                Deleted
              </div>
            </>
          )}
        </Space>
        <Space align="center" id="version-and-follow-section">
          {!isUndefined(version) ? (
            <>
              {!isUndefined(isVersionSelected) ? (
                <Tooltip
                  placement="bottom"
                  title={
                    <p className="tw-text-xs">
                      Viewing older version <br />
                      Go to latest to update details
                    </p>
                  }
                  trigger="hover">
                  {getVersionButton(version)}
                </Tooltip>
              ) : (
                <>{getVersionButton(version)}</>
              )}
            </>
          ) : null}
          {!isUndefined(isFollowing) ? (
            <Button
              className={classNames(
                'tw-border tw-border-primary tw-rounded',
                isFollowing ? 'tw-text-white' : 'tw-text-primary'
              )}
              data-testid="follow-button"
              size="small"
              type={isFollowing ? 'primary' : 'default'}
              onClick={() => {
                !deleted && followHandler?.();
              }}>
              <Space>
                {isFollowing ? (
                  <>
                    <FontAwesomeIcon className="tw-text-xs" icon={faStar} />
                    Unfollow
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon className="tw-text-xs" icon={faStar} />
                    Follow
                  </>
                )}
                <Popover content={getFollowers()} trigger="click">
                  <span
                    className={classNames(
                      'tw-border-l tw-font-medium tw-cursor-pointer hover:tw-underline tw-pl-1',
                      { 'tw-border-primary': !isFollowing }
                    )}
                    data-testid="follower-value"
                    onClick={(e) => e.stopPropagation()}>
                    {followers}
                  </span>
                </Popover>
              </Space>
            </Button>
          ) : null}
          <ManageButton
            entityFQN={entityFqn}
            entityId={entityId}
            entityName={entityName}
            entityType={entityType}
          />
        </Space>
      </Space>

      <div
        className="tw-flex tw-gap-1 tw-mb-2 tw-mt-1 tw-ml-7 tw-flex-wrap tw-items-center"
        data-testid="extrainfo">
        {extraInfo.map((info, index) => (
          <span
            className="tw-flex tw-items-center"
            data-testid={info.key || `info${index}`}
            key={index}>
            <EntitySummaryDetails
              data={info}
              tier={tier}
              updateOwner={updateOwner}
              updateTier={updateTier}
            />
            {extraInfo.length !== 1 && index < extraInfo.length - 1 ? (
              <span className="tw-mx-1.5 tw-inline-block tw-text-gray-400">
                |
              </span>
            ) : null}
          </span>
        ))}
      </div>
      <div
        className="tw-flex tw-flex-wrap tw-pt-1 tw-ml-7 tw-group"
        data-testid="entity-tags">
        {(!isEditable || !isTagEditable || deleted) && (
          <>
            {(tags.length > 0 || !isEmpty(tier)) && (
              <SVGIcons
                alt="icon-tag"
                className="tw-mx-1"
                icon="icon-tag-grey"
                width="16"
              />
            )}
            {tier?.tagFQN && (
              <Tags
                startWith="#"
                tag={{
                  ...tier,
                  tagFQN: tier.tagFQN.split(FQN_SEPARATOR_CHAR)[1],
                }}
                type="label"
              />
            )}
            {tags.length > 0 && <TagsViewer tags={tags} />}
          </>
        )}
        {isTagEditable && !deleted && (
          <Fragment>
            <NonAdminAction
              html={getHtmlForNonAdminAction(Boolean(owner))}
              isOwner={hasEditAccess}
              permission={Operation.EditTags}
              position="bottom"
              trigger="click">
              <div
                className="tw-inline-block tw-mr-1"
                data-testid="tags-wrapper"
                onClick={() => {
                  // Fetch tags and terms only once
                  if (tagList.length === 0 || tagFetchFailed) {
                    fetchTagsAndGlossaryTerms();
                  }
                  setIsEditable(true);
                }}>
                <TagsContainer
                  dropDownHorzPosRight={false}
                  editable={isEditable}
                  isLoading={isTagLoading}
                  selectedTags={getSelectedTags()}
                  showTags={!isTagEditable}
                  size="small"
                  tagList={tagList}
                  onCancel={() => {
                    handleTagSelection();
                  }}
                  onSelectionChange={(tags) => {
                    handleTagSelection(tags);
                  }}>
                  {tags.length || tier ? (
                    <button
                      className="tw-w-auto tw-h-auto tw-flex-none focus:tw-outline-none"
                      data-testid="edit-button">
                      <SVGIcons alt="edit" icon="icon-edit" title="Edit" />
                    </button>
                  ) : (
                    <span>
                      <Tags
                        className="tw-text-primary"
                        startWith="+ "
                        tag="Add tag"
                        type="label"
                      />
                    </span>
                  )}
                </TagsContainer>
              </div>
            </NonAdminAction>
            <div className="tw--mt-1.5">
              {getRequestTagsElements()}
              {getTaskElement()}
              {getThreadElements()}
            </div>
          </Fragment>
        )}
      </div>
      {isViewMore && (
        <FollowersModal
          header={
            <>
              Followers of <span className="tw-text-black">{entityName}</span>{' '}
            </>
          }
          list={entityFollowers}
          onCancel={() => setIsViewMore(false)}
        />
      )}
    </div>
  );
};

export default EntityPageInfo;
